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
    # Ensure this runs even if modules missing, to show error GUI if possible or just print
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
CURRENT_VERSION = "1.0.4"
API_URL = "https://apexmind-saasv3.onrender.com"

# ... (Previous Constants)

# =================================================================================
# GLOBAL STATE
# =================================================================================
icon_instance = None
status_window = None
update_available = False
is_linked = False
linked_username = "Guest"

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
                    # If username not returned, use ID or placeholder "Linked User"
                    # Ideally backend would return a name.
                    linked_username = data.get("user_id", "Connected User")
            
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
        self.root.geometry("450x320") # Slightly wider
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
        
        # 2. Update Update Badge (if waiting)
        # (Could add logic here later)

    def animate_pulse(self):
        # Simple amber pulse when waiting
        # If connected to iRacing (sim_running=True), we make it steady green
        # For now, we assume "waiting" state visually pulse amber/yellow
        
        colors = ["#fbbf24", "#f59e0b"] # Amber 400 -> Amber 500
        self.pulse_state = 1 - self.pulse_state
        
        # Only pulse if NOT connected to sim (logic to add later)
        # For this prototype, we just pulse amber.
        self.lbl_status_icon.config(fg=colors[self.pulse_state])
        
        self.root.after(800, self.animate_pulse)

    # ... (Rest methods same)
    def center_window(self):
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f'{w}x{h}+{x}+{y}')

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

# ... (Installer Logic Unchanged)

# ... (Updater Logic Unchanged)

# ... (Entry Point)
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
    threading.Thread(target=check_link_status, daemon=True).start() # NEW

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
