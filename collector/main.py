import sys
import os
import time
import traceback
import threading
import logging
import webbrowser
import shutil
import subprocess
import requests
import uuid
import json
import tkinter as tk
from tkinter import ttk, messagebox

# Third Party (Must be installed via pip)
try:
    from PIL import Image, ImageDraw
    import pystray
    import pythoncom
    import winshell
    from win32com.client import Dispatch
except ImportError as e:
    print(f"\nCRITICAL IMPORT ERROR: {e}")
    try:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Startup Error", f"Missing dependency: {e}")
    except:
        pass
    sys.exit(1)

# =================================================================================
# CONSTANTS & CONFIG
# =================================================================================
APP_NAME = "ApexMind Agent"
EXECUTABLE_NAME = "ApexMindConnector.exe"
# PRODUCTION URL
DASHBOARD_URL = "https://apexmindsaasv3.vercel.app/link-device" 
VERSION_URL = "https://apexmindsaasv3.vercel.app/download/version.json"
API_URL = "https://apexmind-saasv3.onrender.com"
CURRENT_VERSION = "1.0.5"

# Colors (Dark Theme)
BG_COLOR = "#0f172a"     # Slate 900
FG_COLOR = "#f8fafc"     # Slate 50
ACCENT_COLOR = "#06b6d4" # Cyan 500
CARD_BG = "#1e293b"      # Slate 800

# Paths
TARGET_DIR = os.path.join(os.environ["LOCALAPPDATA"], "ApexMind")
TARGET_EXE = os.path.join(TARGET_DIR, EXECUTABLE_NAME)
LOG_FILE = os.path.join(TARGET_DIR, "agent.log")
CONFIG_FILE = os.path.join(TARGET_DIR, "config.json")
UPDATER_SCRIPT = os.path.join(TARGET_DIR, "update.bat")

# Logging
if not os.path.exists(TARGET_DIR):
    try:
        os.makedirs(TARGET_DIR)
    except:
        pass 

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# =================================================================================
# GLOBAL STATE
# =================================================================================
icon_instance = None
status_window = None
update_available = False
is_linked = False
linked_username = "Guest"

# =================================================================================
# HELPER: DEVICE ID
# =================================================================================
def get_device_id():
    """Retrieves or generates a persistent Device ID."""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                if "device_id" in config:
                    return config["device_id"]
        
        # Generate new ID if not found
        new_id = str(uuid.uuid4())
        config = {"device_id": new_id}
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
        return new_id
    except Exception as e:
        logging.error(f"Failed to get/save Device ID: {e}")
        return str(uuid.uuid4()) # Fallback to transient ID

DEVICE_ID = get_device_id()

# =================================================================================
# HELPER: POLLING THREADS
# =================================================================================
def check_link_status():
    global is_linked, linked_username
    while True:
        try:
            # Poll Backend
            url = f"{API_URL}/devices/{DEVICE_ID}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                is_linked = data.get("linked", False)
                if is_linked:
                    # Get Real Name (display_name) or Fallback
                    linked_username = data.get("display_name") or data.get("user_id", "Connected User")
            
            # Update GUI if open
            if status_window:
                status_window.update_ui_state()
                
        except Exception:
            pass # Silent fail on network error
        time.sleep(30) # Check every 30s

# =================================================================================
# GUI: STATUS WINDOW (Dark Mode + Visual Polish)
# =================================================================================
class StatusWindow:
    def __init__(self, root):
        self.root = root
        self.root.title(APP_NAME)
        self.root.geometry("450x320")
        self.root.configure(bg=BG_COLOR)
        self.root.resizable(False, False)
        
        self.center_window()
        self.build_ui()
        
        # Animations
        self.pulse_state = 0
        self.animate_pulse()

    def center_window(self):
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f'{w}x{h}+{x}+{y}')

    def build_ui(self):
        # Header (Logo + Version)
        header_frame = tk.Frame(self.root, bg=BG_COLOR)
        header_frame.pack(fill="x", pady=20, padx=25)
        
        lbl_title = tk.Label(
            header_frame, 
            text="ApexMind", 
            font=("Segoe UI", 18, "bold"), 
            bg=BG_COLOR, 
            fg="#ffffff"
        )
        lbl_title.pack(side="left")
        
        self.lbl_ver = tk.Label(
            header_frame, 
            text=f"v{CURRENT_VERSION}", 
            font=("Segoe UI", 10, "bold"), 
            bg=BG_COLOR, 
            fg="#22c55e" # Green
        )
        self.lbl_ver.pack(side="left", padx=10, pady=(8,0))

        # User Badge (Top Right)
        self.lbl_user_badge = tk.Label(
            header_frame,
            text="⚫ Guest",
            font=("Segoe UI", 9),
            bg=BG_COLOR, 
            fg="#64748b"
        )
        self.lbl_user_badge.pack(side="right", pady=(5,0))

        # Main Status Card
        card_frame = tk.Frame(self.root, bg=CARD_BG, padx=25, pady=25)
        card_frame.pack(fill="x", padx=25)
        
        # Status - Large Indicator
        self.lbl_status_icon = tk.Label(
            card_frame,
            text="●",
            font=("Segoe UI", 24),
            bg=CARD_BG,
            fg="#fbbf24"
        )
        self.lbl_status_icon.pack(side="left", padx=(0, 15))

        # Status - Text Area
        status_text_frame = tk.Frame(card_frame, bg=CARD_BG)
        status_text_frame.pack(side="left", fill="x", expand=True)

        self.lbl_status_main = tk.Label(
            status_text_frame, 
            text="Waiting for iRacing...", 
            font=("Segoe UI", 13, "bold"), 
            bg=CARD_BG, 
            fg="#ffffff" 
        )
        self.lbl_status_main.pack(anchor="w")
        
        self.lbl_status_sub = tk.Label(
            status_text_frame, 
            text="Launch the simulator to start tracking.", 
            font=("Segoe UI", 9), 
            bg=CARD_BG, 
            fg="#94a3b8"
        )
        self.lbl_status_sub.pack(anchor="w", pady=(2,0))
        
        # Device ID Footer
        lbl_device = tk.Label(
            self.root, 
            text=f"Device ID: {DEVICE_ID}", 
            font=("Segoe UI", 8), 
            bg=BG_COLOR, 
            fg="#334155"
        )
        lbl_device.pack(side="bottom", pady=10)

        # Actions
        btn_frame = tk.Frame(self.root, bg=BG_COLOR)
        btn_frame.pack(fill="x", padx=25, pady=(20, 0))

        btn_dashboard = tk.Button(
            btn_frame,
            text="Open Dashboard",
            bg=ACCENT_COLOR,
            fg="white",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            padx=15,
            pady=8,
            cursor="hand2",
            command=self.open_dashboard
        )
        btn_dashboard.pack(side="left", fill="x", expand=True, padx=(0, 10))

        btn_hide = tk.Button(
            btn_frame,
            text="Hide to Tray",
            bg=CARD_BG,
            fg="white",
            font=("Segoe UI", 10),
            relief="flat",
            padx=15,
            pady=8,
            cursor="hand2",
            command=self.hide_window
        )
        btn_hide.pack(side="right", fill="x", expand=True, padx=(10, 0))

        # Protocol
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)

    def update_ui_state(self):
        # 1. Update User Badge
        if is_linked:
            self.lbl_user_badge.config(text=f"🟢 {linked_username}", fg="#22c55e")
        else:
            self.lbl_user_badge.config(text="🔴 Not Linked", fg="#ef4444")

    def animate_pulse(self):
        # Simple amber pulse when waiting
        colors = ["#fbbf24", "#f59e0b"] # Amber 400 -> Amber 500
        self.pulse_state = 1 - self.pulse_state
        self.lbl_status_icon.config(fg=colors[self.pulse_state])
        self.root.after(800, self.animate_pulse)

    def open_dashboard(self):
        url = f"{DASHBOARD_URL}?deviceId={DEVICE_ID}"
        logging.info(f"Opening dashboard: {url}")
        webbrowser.open(url)

    def hide_window(self):
        self.root.withdraw()
        if icon_instance:
            icon_instance.notify("ApexMind is running in the background.", title=APP_NAME)
    
    def show(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self.update_ui_state()

# =================================================================================
# GUI: INSTALLER
# =================================================================================
class InstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{APP_NAME} Installer")
        self.root.geometry("400x180")
        self.root.resizable(False, False)
        self.center_window()
        
        style = ttk.Style()
        style.configure("TProgressbar", thickness=20)
        self.label = ttk.Label(root, text=f"Installing {APP_NAME}...", font=("Segoe UI", 12))
        self.label.pack(pady=20)

        self.progress = ttk.Progressbar(root, orient="horizontal", length=350, mode="determinate")
        self.progress.pack(pady=10)

        self.status = ttk.Label(root, text="Initializing...", font=("Segoe UI", 9), foreground="gray")
        self.status.pack(pady=5)

        self.install_thread = threading.Thread(target=self.run_installation)
        self.install_thread.start()

    def center_window(self):
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f'{w}x{h}+{x}+{y}')

    def update_status(self, text, value):
        self.status.config(text=text)
        self.progress['value'] = value
        self.root.update_idletasks()

    def run_installation(self):
        try:
            pythoncom.CoInitialize() 
            self.update_status("Creating directories...", 10)
            time.sleep(0.5)
            if not os.path.exists(TARGET_DIR):
                os.makedirs(TARGET_DIR)

            self.update_status("Copying files...", 30)
            time.sleep(0.5)
            current_exe = sys.executable
            if os.path.normpath(current_exe) != os.path.normpath(TARGET_EXE):
                shutil.copy2(current_exe, TARGET_EXE)
            
            self.update_status("Creating shortcuts...", 60)
            time.sleep(0.5)
            self.create_shortcut("Desktop", winshell.desktop())
            self.create_shortcut("StartMenu", winshell.programs())

            self.update_status("Finalizing...", 90)
            time.sleep(1)
            self.update_status("Installation Complete!", 100)
            time.sleep(0.5)
            pythoncom.CoUninitialize() 
            
            if os.path.normpath(current_exe) != os.path.normpath(TARGET_EXE):
                 os.startfile(TARGET_EXE)
            self.root.quit()
        except Exception as e:
            messagebox.showerror("Installation Failed", str(e))
            pythoncom.CoUninitialize()
            self.root.quit()

    def create_shortcut(self, name, folder):
        try:
            path = os.path.join(folder, f"{APP_NAME}.lnk")
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(path)
            shortcut.Targetpath = TARGET_EXE
            shortcut.WorkingDirectory = TARGET_DIR
            shortcut.IconLocation = TARGET_EXE
            shortcut.save()
        except:
            pass

def is_installed():
    current_exe = sys.executable
    if not getattr(sys, 'frozen', False):
        return True 
    return os.path.normpath(current_exe).lower() == os.path.normpath(TARGET_EXE).lower()

def run_installer():
    root = tk.Tk()
    app = InstallerGUI(root)
    root.mainloop()
    sys.exit(0)

# =================================================================================
# UPDATE LOGIC
# =================================================================================
def check_for_updates(current_version):
    try:
        response = requests.get(VERSION_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get("version") and data.get("version") != current_version:
            return data.get("url"), data.get("version")
    except:
        pass
    return None, None

def update_agent(download_url):
    try:
        response = requests.get(download_url, stream=True)
        response.raise_for_status()
        new_exe = f"{sys.executable}.new"
        with open(new_exe, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        current_exe = sys.executable
        batch_script = f"""
@echo off
:loop
timeout /t 1 /nobreak > NUL
del "{current_exe}"
if exist "{current_exe}" goto loop

rename "{os.path.basename(new_exe)}" "{os.path.basename(current_exe)}"
start "" "{current_exe}"
del "%~f0"
"""
        with open(UPDATER_SCRIPT, "w") as f:
            f.write(batch_script)
        
        # Launch updater and kill self immediately
        subprocess.Popen(UPDATER_SCRIPT, shell=True)
        os._exit(0) # Force kill
    except Exception as e:
        logging.error(f"Update failed: {e}")

# =================================================================================
# APPLICATION ENTRY & LOOPS
# =================================================================================
def create_tray_icon():
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), (33, 37, 41))
    dc = ImageDraw.Draw(image)
    dc.rectangle((16, 16, 48, 48), fill=(0, 255, 255))
    return image

def on_connect(icon, item):
    url = f"{DASHBOARD_URL}?deviceId={DEVICE_ID}"
    logging.info(f"Opening dashboard: {url}")
    webbrowser.open(url)

def on_tray_open(icon, item):
    if status_window:
        # Use existing GUI loop
        status_window.root.after(0, status_window.show)

def on_tray_exit(icon, item):
    icon.stop()
    if status_window:
        status_window.root.quit()
    os._exit(0)

def tray_thread_func():
    global icon_instance
    image = create_tray_icon()
    menu = pystray.Menu(
        pystray.MenuItem("Open Status", on_tray_open, default=True),
        pystray.MenuItem("Connect Account", on_connect),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit", on_tray_exit)
    )
    icon_instance = pystray.Icon("ApexMind", image, APP_NAME, menu)
    icon_instance.run()

def background_task_loop():
    last_update_check = 0
    while True:
        try:
            # Update Check (Hourly)
            if time.time() - last_update_check > 3600:
                d_url, n_ver = check_for_updates(CURRENT_VERSION)
                if d_url:
                     if icon_instance:
                        icon_instance.notify(f"New version {n_ver} available.", title="Update Found")
                     update_agent(d_url)
                last_update_check = time.time()
            time.sleep(5)
        except:
            time.sleep(5)

def main():
    global status_window
    
    if not is_installed():
        run_installer()
        return

    d_url, n_ver = check_for_updates(CURRENT_VERSION)
    if d_url:
        update_agent(d_url)
        return

    # Start Threads
    threading.Thread(target=tray_thread_func, daemon=True).start()
    threading.Thread(target=background_task_loop, daemon=True).start()
    threading.Thread(target=check_link_status, daemon=True).start()

    root = tk.Tk()
    status_window = StatusWindow(root)
    root.withdraw() 
    root.mainloop()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Emergency GUI Error
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Fatal Error", str(e))
        except:
            pass
