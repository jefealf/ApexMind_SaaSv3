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

Base.metadata.create_all(bind=engine)
app = FastAPI(title="ApexMind API", version="2.0.0 (Robust)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Keep * for development/generic access if needed, or restrict to specific domains
    allow_origin_regex=r"https://apexmindsaasv3.*\.vercel\.app", # Allow Vercel Preview/Production URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"status": "online", "message": "ApexMind API is running 🚀"}
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

# --- ROTAS ---
@app.post("/upload/lap")
def upload_lap(data: LapData, db: Session = Depends(get_db)):
    if not data.telemetry: raise HTTPException(400)
    
    # --- VALIDAÇÃO DE INTEGRIDADE ---
    # Rejeita voltas que não terminaram (ex: crash ou quit)
    if data.telemetry[-1].lap_dist_pct < 0.9:
        raise HTTPException(400, "Volta incompleta (Distância coberta < 90%)")
        
    lap_time = data.telemetry[-1].time - data.telemetry[0].time
    df = clean_telemetry_data(data.telemetry) # Limpa antes de salvar
    s1, s2, s3 = calculate_sectors(df)
    
    filename = f"lap_{data.session_id}_{data.lap_number}.json"
    file_path = os.path.join("telemetry_storage", filename)
    with open(file_path, "w") as f: json.dump(data.dict(), f)
    
    db_lap = LapDB(session_id=data.session_id, lap_number=data.lap_number, car_name=data.car_name, track_name=data.track_name, lap_time=lap_time, s1=s1, s2=s2, s3=s3, storage_path=file_path)
    db.add(db_lap); db.commit()
    return {"status": "saved", "lap_id": db_lap.id}

@app.get("/laps")
def list_laps(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(LapDB).order_by(LapDB.id.desc()).offset(skip).limit(limit).all()

@app.delete("/laps/{lap_id}")
def delete_lap(lap_id: int, db: Session = Depends(get_db)):
    l = db.query(LapDB).filter(LapDB.id==lap_id).first()
    if l: db.delete(l); db.commit(); 
    return {"status": "deleted"}

@app.get("/compare/{base_id}/{target_id}")
def compare_laps(base_id: int, target_id: int, db: Session = Depends(get_db)):
    lb = db.query(LapDB).filter(LapDB.id==base_id).first()
    lt = db.query(LapDB).filter(LapDB.id==target_id).first()
    if not lb or not lt: raise HTTPException(404, "Laps not found")

    with open(lb.storage_path) as f: db_data = json.load(f)
    with open(lt.storage_path) as f: dt_data = json.load(f)

    # 1. Limpeza Robusta
    df_b = clean_telemetry_data(LapData(**db_data).telemetry)
    df_t = clean_telemetry_data(LapData(**dt_data).telemetry)
    
    # 2. Interpolação (Evita erro se distancias forem diferentes)
    common_dist = np.linspace(0, 1, 1000)
    def safe_interp(df, col, kind='linear'):
        if col not in df.columns: return np.zeros_like(common_dist)
        return interp1d(df['lap_dist_pct'], df[col], kind=kind, bounds_error=False, fill_value="extrapolate")(common_dist)

    an = pd.DataFrame({'dist_pct': common_dist})
    cols = ['speed','throttle','brake','steering','map_x','map_y','lat_accel','lon_accel','gear']
    for c in cols:
        an[f'{c}_base'] = safe_interp(df_b, c)
        an[f'{c}_target'] = safe_interp(df_t, c)
    
    # 3. Delta Corrigido (Target - Base)
    an['time_base'] = safe_interp(df_b, 'time') - df_b.iloc[0]['time']
    an['time_target'] = safe_interp(df_t, 'time') - df_t.iloc[0]['time']
    an['time_delta'] = an['time_target'] - an['time_base']

    # 4. Dados para o Front
    chart_data = {
        "dist": np.round(common_dist*100, 1).tolist(),
        "time_delta": np.round(an['time_delta'], 3).tolist(),
        "speed_base": np.round(an['speed_base'], 1).tolist(),
        "speed_target": np.round(an['speed_target'], 1).tolist(),
        "throttle_base": np.round(an['throttle_base']*100, 0).tolist(),
        "throttle_target": np.round(an['throttle_target']*100, 0).tolist(),
        "brake_base": np.round(an['brake_base']*100, 0).tolist(),
        "brake_target": np.round(an['brake_target']*100, 0).tolist(),
        "steer_target": np.round(an['steering_target']*57.3, 1).tolist(), # Rad -> Deg
        "steer_base": np.round(an['steering_base']*57.3, 1).tolist(),
        "map_x_base": np.round(an['map_x_base'], 2).tolist(),
        "map_y_base": np.round(an['map_y_base'], 2).tolist(),
        "map_x_target": np.round(an['map_x_target'], 2).tolist(),
        "map_y_target": np.round(an['map_y_target'], 2).tolist(),
        "lat_accel_target": np.round(an['lat_accel_target'], 2).tolist(),
        "lon_accel_target": np.round(an['lon_accel_target'], 2).tolist(),
        "gear_target": np.round(an['gear_target'], 0).astype(int).tolist(),
        "gear_base": np.round(an['gear_base'], 0).astype(int).tolist()
    }

    # 5. Corners
    corners = detect_corners(df_t)
    corner_res = []
    for c in corners:
        idx_s = int(c['start']*1000); idx_e = int(c['end']*1000)
        idx_s = max(0, min(999, idx_s)); idx_e = max(0, min(999, idx_e))
        
        diff = an['time_delta'].iloc[idx_e] - an['time_delta'].iloc[idx_s]
        apex_v = an['speed_target'].iloc[idx_s:idx_e].min()
        apex_diff = apex_v - an['speed_base'].iloc[idx_s:idx_e].min()
        
        corner_res.append({
            "name": c['name'], "start": c['start'], "gain_loss": round(diff, 3),
            "apex_speed_target": round(apex_v, 1), "apex_speed_diff": round(apex_diff, 1),
            "status": "loss" if diff > 0.05 else ("gain" if diff < -0.05 else "neutral"),
            "message": "Perda" if diff > 0.05 else "Ganho"
        })

    return {
        "metadata": {"gap_total": round(an['time_delta'].iloc[-1], 3), "track_name": lt.track_name, "base_time": lb.lap_time, "target_time": lt.lap_time},
        "chart_data": chart_data,
        "corners": corner_res
    }

import uuid

class DriverLinkRequest(BaseModel):
    user_id: str
    iracing_id: str

@app.post("/driver/link")
def link_driver(data: DriverLinkRequest, db: Session = Depends(get_db)):
    driver = db.query(DriverDB).filter(DriverDB.user_id == data.user_id).first()
    if not driver:
        # Create new profile
        token = str(uuid.uuid4())
        driver = DriverDB(user_id=data.user_id, iracing_customer_id=data.iracing_id, api_token=token)
        db.add(driver)
    else:
        # Update existing
        driver.iracing_customer_id = data.iracing_id
    
    db.commit()
    db.refresh(driver)
    return {"status": "linked", "api_token": driver.api_token, "iracing_id": driver.iracing_customer_id}

class DeviceLinkRequest(BaseModel):
    user_id: str
    device_id: str

@app.post("/driver/link_device")
def link_device_token(data: DeviceLinkRequest, db: Session = Depends(get_db)):
    """Links a local agent device_id to the user's account."""
    driver = db.query(DriverDB).filter(DriverDB.user_id == data.user_id).first()
    if not driver:
        # Create new profile if not exists
        driver = DriverDB(user_id=data.user_id, api_token=data.device_id, iracing_customer_id="")
        db.add(driver)
    else:
        # Update device token
        driver.api_token = data.device_id
    
    db.commit()
    return {"status": "linked", "device_id": data.device_id}

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