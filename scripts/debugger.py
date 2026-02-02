import irsdk
import time
import os

def debug_telemetry():
    ir = irsdk.IRSDK()
    
    print("⏳ Procurando iRacing...")
    while not (ir.startup() and ir.is_initialized and ir.is_connected):
        time.sleep(1)
        
    print("✅ Conectado! Lendo dicionário de variáveis...")
    
    # Pega todas as chaves disponíveis na memória
    # O método pode variar dependendo da versão da lib, vamos tentar varrer
    try:
        # Tenta pegar os headers
        headers = ir.var_headers_names
        print(f"\n📊 Encontradas {len(headers)} variáveis de telemetria.")
        
        # Filtra as que parecem GPS ou Posição
        gps_candidates = [h for h in headers if "lat" in h.lower() or "lon" in h.lower() or "x" in h.lower() or "y" in h.lower()]
        
        print("\n🔍 Variáveis suspeitas de GPS/Posição:")
        for var in gps_candidates:
            val = ir[var]
            print(f"   - {var}: {val}")
            
        print("\n--- TESTE DIRETO DAS CHAVES PADRÃO ---")
        print(f"Lat: {ir['Lat']}")
        print(f"Lon: {ir['Lon']}")
        print(f"Alt: {ir['Alt']}")
        
    except Exception as e:
        print(f"❌ Erro ao ler variáveis: {e}")

if __name__ == "__main__":
    debug_telemetry()