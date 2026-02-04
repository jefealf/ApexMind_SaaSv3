import time
import logging
import threading
from .irsdk import IRSDK
from .api import update_career_stats
from .config import DEVICE_ID

class TelemetryManager:
    def __init__(self, root_gui, device_id):
        self.ir = IRSDK()
        self.running = False
        self.root_gui = root_gui
        self.device_id = device_id
        self.last_sent_irating = -1

    def start(self):
        self.running = True
        threading.Thread(target=self.loop, daemon=True).start()

    def loop(self):
        logging.info("Sistema de Telemetria iniciado (Aguardando iRacing...)")
        
        was_connected = False
        
        while self.running:
            if not self.ir.is_connected:
                if was_connected:
                    logging.info("iRacing desconectado. Pausando coleta.")
                    was_connected = False
                
                # Try to startup
                if self.ir.startup():
                    logging.info("Simulador detectado! Conectando...")
                    was_connected = True
                    time.sleep(2) # Give it a moment
                else:
                    time.sleep(5) # Scan interval
                    continue
            
            # Connected logic
            try:
                # 1. Get Session Info (YAML) - Contains licenses, iRating, ID
                session = self.ir.get_session_info()
                
                if session:
                    driver = session.get('DriverInfo', {})
                    
                    irating = driver.get('DriverIRating', 0)
                    lic_class = driver.get('DriverLicName', "R") # e.g. "A 4.99" is split usually? No, raw string
                    sr = driver.get('DriverSafetyRating', 0.0)
                    
                    # Sometimes raw name is "A 2.50". We might want to split?
                    # Keep raw for now.
                    
                    # Check if changed significantly or just periodically send
                    if irating != 0 and irating != self.last_sent_irating:
                        logging.info(f"Dados Recebidos: iRating {irating}, SR {sr}, Licença {lic_class}")
                        
                        # Send to API
                        success = update_career_stats(self.device_id, {
                            "irating": int(irating),
                            "safety_rating": float(sr),
                            "license_class": str(lic_class)
                        })
                        
                        if success:
                            logging.info("Carteira sincronizada com a nuvem sucesso!")
                            self.last_sent_irating = irating
                        
            except Exception as e:
                # logging.error(f"Erro no loop de telemetria: {e}")
                pass
            
            time.sleep(10) # Update stats every 10s (no need for high freq)

