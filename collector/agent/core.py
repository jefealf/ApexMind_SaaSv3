import threading
import tkinter as tk
import time
import os
import sys
import subprocess
import logging
import pystray
from PIL import Image

from .config import *
from .gui import StatusWindow
from .api import check_link_status_api
from .updater import check_for_updates, download_installer
from .telemetry import TelemetryManager

def tray_thread_func(root_ref):
    """Runs the System Tray Icon."""
    def on_quit(icon, item):
        icon.stop()
        root_ref.quit()
        sys.exit(0)

    def on_show(icon, item):
        root_ref.after(0, root_ref.deiconify)
        root_ref.after(0, root_ref.lift)

    # Use a solid color icon if image fails
    image = Image.new('RGB', (64, 64), color=ACCENT_COLOR) # Placeholder
    
    menu = pystray.Menu(
        pystray.MenuItem("Show", on_show, default=True),
        pystray.MenuItem("Quit", on_quit)
    )
    
    icon = pystray.Icon(APP_NAME, image, APP_NAME, menu)
    icon.run()

class AgentApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.withdraw() # Start hidden
        
        # Load Device ID
        from .config import DEVICE_ID # Re-import to ensure it's loaded
        self.device_id = DEVICE_ID
        
        # UI
        self.window = StatusWindow(self.root, self.device_id, None, self.hide_window)
        
        # State
        self.running = True
        
        # Threads
        threading.Thread(target=self.bg_link_check, daemon=True).start()
        threading.Thread(target=self.bg_update_check, daemon=True).start()
        threading.Thread(target=lambda: tray_thread_func(self.root), daemon=True).start()
        
        # Telemetry
        self.telemetry = TelemetryManager(self.window, self.device_id)
        self.telemetry.start()

    def run(self):
        # Initial check to show/hide based on preference could go here
        # For now, we show it on launch
        self.window.show()
        self.root.mainloop()

    def hide_window(self):
        self.root.withdraw()

    def bg_link_check(self):
        last_status = None
        while self.running:
            try:
                # logging.info("Checking connection status...") # Optional: verbose
                is_linked, name = check_link_status_api(self.device_id)
                
                # Log only on change or initial
                current_status = (is_linked, name)
                if current_status != last_status:
                    if is_linked:
                        logging.info(f"Conectado! Sincronizando dados de {name}...")
                    else:
                        logging.warning("Aguardando conexão com sua conta...")
                    last_status = current_status
                
                # Update GUI safely
                self.root.after(0, lambda: self.window.update_state(is_linked, name))
                
            except Exception as e:
                # Log warning only if it's a new error type to avoid spam
                logging.warning("Tentando estabelecer conexão com a nuvem...")
                
            time.sleep(10)

    def bg_update_check(self):
        # Wait a bit before first check
        time.sleep(5)
        while self.running:
            logging.info("Buscando melhorias...")
            try:
                url, ver = check_for_updates()
                if url:
                    logging.info(f"Encontramos uma novidade! Versão {ver} disponível.")
                    # Logic to trigger update (Download and Run Installer)
                    # For now, we just log it. In v2, we'll prompt the user or auto-update.
                    # Auto-update logic:
                    temp_path = os.path.join(os.environ["TEMP"], f"ApexMindSetup_{ver}.exe")
                    if download_installer(url, temp_path):
                         self.trigger_update(temp_path)
            except Exception as e:
                logging.warning("Não foi possível verificar atualizações agora. (Tentando novamente em breve)")
                # Logic to trigger update (Download and Run Installer)
                # For now, we just log it. In v2, we'll prompt the user or auto-update.
                # Auto-update logic:
                temp_path = os.path.join(os.environ["TEMP"], f"ApexMindSetup_{ver}.exe")
                if download_installer(url, temp_path):
                     self.trigger_update(temp_path)
            time.sleep(3600) # Check every hour

    def trigger_update(self, installer_path):
        logging.info("Atualizando o sistema... Até logo!")
        subprocess.Popen([installer_path, "/SILENT"]) # Assuming installer supports silent
        self.root.quit()
        sys.exit(0)

def main():
    app = AgentApp()
    app.run()
