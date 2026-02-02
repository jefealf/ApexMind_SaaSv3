import irsdk
import time
import sys
import math
import os
import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000/upload/lap"
API_TOKEN = os.getenv('API_TOKEN', 'YOUR_TOKEN_HERE')

class ApexMindRecorder:
    def __init__(self):
        self.ir = irsdk.IRSDK()
        self.is_connected = False
        self.last_lap = -1
        self.current_lap_data = [] 
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.x = 0.0; self.y = 0.0; self.last_time = 0.0
        self.car_name = "Unknown"; self.track_name = "Unknown"; self.info_fetched = False

    def check_connection(self):
        if self.ir.startup() and self.ir.is_initialized and self.ir.is_connected:
            self.is_connected = True
            if not self.info_fetched: self.fetch_static_info()
            return True
        self.is_connected = False; self.info_fetched = False; return False

    def fetch_static_info(self):
        try:
            d = self.ir['DriverInfo']
            w = self.ir['WeekendInfo']
            if d: self.car_name = d['Drivers'][d['DriverCarIdx']]['CarScreenNameShort']
            if w: self.track_name = w['TrackDisplayName']
            print(f"✅ Sessão: {self.car_name} @ {self.track_name}")
            self.info_fetched = True
        except: pass

    def send_to_cloud(self, lap_number, data_list):
        if not data_list: return
        print(f"\n☁️ Enviando volta {lap_number} ({len(data_list)} pts)...")
        # Centraliza Mapa
        start_x = data_list[0]['map_x']
        start_y = data_list[0]['map_y']
        for point in data_list:
            point['map_x'] -= start_x
            point['map_y'] -= start_y

        try:
            requests.post(API_URL, json={
                "session_id": self.session_id, "lap_number": lap_number,
                "car_name": str(self.car_name), "track_name": str(self.track_name),
                "telemetry": data_list
            }, headers={"Authorization": f"Bearer {API_TOKEN}"})
            print(f"🚀 Volta {lap_number} enviada!")
        except Exception as e: print(f"❌ Erro API: {e}")

    def get_telemetry_snapshot(self):
        if not self.is_connected: return None
        self.ir.freeze_var_buffer_latest()
        try:
            t = float(self.ir['SessionTime'])
            speed = float(self.ir['Speed'])
            yaw = float(self.ir['Yaw'])
            
            if self.last_time == 0: dt = 0.016
            else: dt = t - self.last_time
            if dt > 0.1: dt = 0.016 # Evita pulos grandes
            
            self.x += speed * math.cos(yaw) * dt
            self.y += speed * math.sin(yaw) * dt
            self.last_time = t

            # --- CORREÇÃO DE LEITURA G-FORCE ---
            # Tentamos ler diretamente. Se der erro (carro não tem o sensor), usa 0.0
            try: lat_accel = float(self.ir['LatAccel'])
            except: lat_accel = 0.0
            
            try: lon_accel = float(self.ir['LongAccel'])
            except: lon_accel = 0.0

            # Mesma lógica para ABS/TC (nem todos os carros têm)
            try: abs_active = bool(self.ir['BrakeABSactive'])
            except: abs_active = False
            
            try: tc_active = bool(self.ir['EngineWarnings'] & 0x4)
            except: tc_active = False

            return {
                'time': t, 'lap': int(self.ir['Lap']), 'lap_dist_pct': float(self.ir['LapDistPct']),
                'throttle': float(self.ir['Throttle']), 'brake': float(self.ir['Brake']),
                'steering': float(self.ir['SteeringWheelAngle']), 'gear': int(self.ir['Gear']),
                'speed': speed * 3.6, 'rpm': float(self.ir['RPM']),
                'map_x': self.x, 'map_y': self.y,
                'abs_active': abs_active, 'tc_active': tc_active,
                'lat_accel': lat_accel, 'lon_accel': lon_accel
            }
        except Exception: return None

    def run(self):
        print("🟢 ApexMind Recorder (Fixed) iniciado...")
        try:
            while True:
                if self.check_connection():
                    data = self.get_telemetry_snapshot()
                    if data:
                        if data['lap'] != self.last_lap and self.last_lap != -1:
                            # --- VALIDAÇÃO DE VOLTA COMPLETA ---
                            # Só envia se tiver dados suficientes e cobrir a pista (começo < 10% e fim > 90%)
                            if (len(self.current_lap_data) > 100 and 
                                self.current_lap_data[-1]['lap_dist_pct'] > 0.9 and 
                                self.current_lap_data[0]['lap_dist_pct'] < 0.1):
                                
                                self.send_to_cloud(self.last_lap, self.current_lap_data)
                            else:
                                print(f"\n🗑️ Volta {self.last_lap} descartada (Incompleta/Inválida).")
                            
                            self.current_lap_data = []
                        
                        self.current_lap_data.append(data)
                        self.last_lap = data['lap']
                        # Print de Debug para ver se G-Force está vindo
                        sys.stdout.write(f"\r📡 LatG: {data['lat_accel']:.2f} | LonG: {data['lon_accel']:.2f}   ")
                        sys.stdout.flush()
                    time.sleep(1/60)
                else:
                    sys.stdout.write("\r❌ Aguardando iRacing...")
                    time.sleep(1)
        except KeyboardInterrupt: print("\n🛑 Fim.")

if __name__ == "__main__": ApexMindRecorder().run()