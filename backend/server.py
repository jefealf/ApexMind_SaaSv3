from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import json
import os
import pandas as pd
import numpy as np
from scipy.interpolate import interp1d
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# --- SETUP DATABASE ---
DATABASE_URL = os.getenv('DATABASE_URL', "sqlite:///./apexmind.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class LapDB(Base):
    __tablename__ = "laps"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True) # [Cloud] Linked to Clerk ID
    session_id = Column(String, index=True)
    lap_number = Column(Integer)
    car_name = Column(String, index=True)
    track_name = Column(String, index=True)
    lap_time = Column(Float)
    s1 = Column(Float, default=0.0); s2 = Column(Float, default=0.0); s3 = Column(Float, default=0.0)
    storage_path = Column(String); created_at = Column(DateTime, default=datetime.utcnow)

class DriverDB(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True) # Clerk ID
    display_name = Column(String, nullable=True) # [NEW] Real Name
    iracing_customer_id = Column(String, nullable=True)
    api_token = Column(String, unique=True, index=True) # Token for Collector
    
    # New Stats Columns
    irating = Column(Integer, default=0)
    safety_rating = Column(Float, default=0.0)
    license_class = Column(String, default="R")
    cpi = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Import API Client
try:
    from backend.iracing_api import IRacingAPI
except ImportError:
    from iracing_api import IRacingAPI

# FORCE SCHEMA UPDATE (Safe for Prototype/Dev Phase)
try:
    # Check if we need to rebuild drivers table (by trying to select from it)
    with engine.connect() as conn:
        conn.execute("SELECT display_name FROM drivers LIMIT 1")
except:
    # Column missing or table mismatch -> Drop and Recreate
    print("MIGRATION: Drivers table schema mismatch (display_name). Recreating...")
    DriverDB.__table__.drop(engine, checkfirst=True)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="ApexMind API", version="2.5 (Fix)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_origin_regex=r"https://apexmindsaasv3.*\.vercel\.app", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "ApexMind API v2.5 is running 🚀", "version": "2.5"}

if not os.path.exists('telemetry_storage'): os.makedirs('telemetry_storage')

def get_db():
    db = SessionLocal(); 
    try: yield db
    finally: db.close()

class TelemetryPoint(BaseModel):
    lap_dist_pct: float; speed: float; throttle: float; brake: float; gear: int
    steering: float; rpm: float; time: float; map_x: float; map_y: float
    lat_accel: float = 0.0; lon_accel: float = 0.0; abs_active: bool = False; tc_active: bool = False

class LapData(BaseModel):
    session_id: str; lap_number: int; car_name: str; track_name: str; telemetry: List[TelemetryPoint]

# --- FUNÇÕES ROBUSTAS ---
def clean_telemetry_data(telemetry_list):
    """Limpa dados para evitar crash na interpolação."""
    df = pd.DataFrame([t.dict() for t in telemetry_list])
    # 1. Remove duplicatas de distância (comum em iRacing)
    df = df.drop_duplicates(subset=['lap_dist_pct'])
    # 2. Garante ordem crescente
    df = df.sort_values(by='lap_dist_pct')
    # 3. Garante que começa em 0 e termina próximo de 1
    return df

def calculate_sectors(df):
    try:
        t_start = df.iloc[0]['time']
        idx_s1 = (df['lap_dist_pct'] - 0.3333).abs().idxmin()
        idx_s2 = (df['lap_dist_pct'] - 0.6666).abs().idxmin()
        return df.loc[idx_s1]['time'] - t_start, df.loc[idx_s2]['time'] - df.loc[idx_s1]['time'], df.iloc[-1]['time'] - df.loc[idx_s2]['time']
    except: return 0.0, 0.0, 0.0

def detect_corners(df):
    if 'lat_accel' not in df.columns: return []
    corners = []; in_corner = False; start_pct = 0
    for i, row in df.iterrows():
        if abs(row['lat_accel']) > 0.25:
            if not in_corner: in_corner = True; start_pct = row['lap_dist_pct']
        elif in_corner:
            in_corner = False
            if (row['lap_dist_pct'] - start_pct) > 0.01:
                corners.append({"name": f"T{len(corners)+1}", "start": start_pct, "end": row['lap_dist_pct']})
    if in_corner: corners.append({"name": f"T{len(corners)+1}", "start": start_pct, "end": 1.0})
    return corners

class DeviceLinkRequest(BaseModel):
    user_id: str
    device_id: str
    display_name: str = "Racer" # [NEW] Optional Default

@app.post("/driver/link_device")
def link_device_token(data: DeviceLinkRequest, db: Session = Depends(get_db)):
    """Links a local agent device_id to the user's account."""
    driver = db.query(DriverDB).filter(DriverDB.user_id == data.user_id).first()
    if not driver:
        # Create new profile if not exists
        driver = DriverDB(
            user_id=data.user_id, 
            api_token=data.device_id, 
            display_name=data.display_name,
            iracing_customer_id=""
        )
        db.add(driver)
    else:
        # Update device token AND name
        driver.api_token = data.device_id
        if data.display_name:
            driver.display_name = data.display_name
    
    db.commit()
    return {"status": "linked", "device_id": data.device_id, "name": driver.display_name}

# SAFE ROUTE (Bypasses /driver/{id} conflict)
@app.post("/devices/link")
def link_device_token_safe(data: DeviceLinkRequest, db: Session = Depends(get_db)):
    return link_device_token(data, db)

class IRacingAuthRequest(BaseModel):
    user_id: str
    username: str
    password: str

@app.get("/devices/{device_id}")
def check_device_link(device_id: str, db: Session = Depends(get_db)):
    """Checks if a device ID is linked to a user."""
    driver = db.query(DriverDB).filter(DriverDB.api_token == device_id).first()
    if driver:
        return {
            "linked": True, 
            "user_id": driver.user_id, 
            "display_name": driver.display_name or "Racer", # [NEW]
            "iracing_id": driver.iracing_customer_id
        }
    return {"linked": False, "user_id": None}

@app.get("/driver/{user_id}")
def get_driver(user_id: str, db: Session = Depends(get_db)):
    driver = db.query(DriverDB).filter(DriverDB.user_id == user_id).first()
    if not driver:
        # Auto-create empty profile if accessing for first time via UI
        token = str(uuid.uuid4())
        driver = DriverDB(user_id=user_id, iracing_customer_id="", api_token=token)
        db.add(driver); db.commit(); db.refresh(driver)
    
    return {"user_id": driver.user_id, "iracing_id": driver.iracing_customer_id, "api_token": driver.api_token, 
            "stats": {"irating": driver.irating, "sr": driver.safety_rating, "license": driver.license_class}}

class CareerStatsUpdate(BaseModel):
    device_id: str
    irating: int
    license_class: str
    safety_rating: float

@app.post("/telemetry/career")
def update_career_stats(data: CareerStatsUpdate, db: Session = Depends(get_db)):
    """Receives career stats from the local agent (via device_id)."""
    driver = db.query(DriverDB).filter(DriverDB.api_token == data.device_id).first()
    if not driver:
        raise HTTPException(404, "Device not linked or User not found")
    
    driver.irating = data.irating
    driver.license_class = data.license_class
    driver.safety_rating = data.safety_rating
    
    db.commit()
    return {"status": "updated", "new_irating": driver.irating}

@app.post("/driver/sync_iracing")
def sync_iracing_data(data: IRacingAuthRequest, db: Session = Depends(get_db)):
    # 1. Login to iRacing
    api = IRacingAPI()
    success, msg = api.login(data.username, data.password)
    
    if not success:
        raise HTTPException(status_code=401, detail=msg)
    
    # 2. Fetch Data
    info = api.get_member_info()
    if not info:
        raise HTTPException(status_code=500, detail="Failed to fetch member info")
        
    # Extract Stats (Assuming Road license for now as primary, or get highest)
    # iRacing info structure varies, we look for 'licenses'
    licenses = info.get('licenses', [])
    road_license = next((l for l in licenses if l['category_name'] == "Sports Car"), None)
    
    if not road_license:
        # Fallback to first available
        road_license = licenses[0] if licenses else {}

    irating = road_license.get('irating', 0)
    sr = road_license.get('safety_rating', 0.0)
    lic_group = road_license.get('group_name', 'R')
    cust_id = info.get('cust_id', 0)

    # 3. Update DB
    driver = db.query(DriverDB).filter(DriverDB.user_id == data.user_id).first()
    if not driver:
         driver = DriverDB(user_id=data.user_id, iracing_customer_id=str(cust_id), api_token=str(uuid.uuid4()))
         db.add(driver)
    
    driver.iracing_customer_id = str(cust_id)
    driver.irating = irating
    driver.safety_rating = sr
    driver.license_class = lic_group
    
    db.commit()
    db.refresh(driver)
    
    return {"status": "synced", "stats": {"irating": irating, "sr": sr, "license": lic_group}}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)