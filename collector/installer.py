import os
import sys
import shutil
import winshell
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from win32com.client import Dispatch

APP_NAME = "ApexMind Agent"
EXECUTABLE_NAME = "ApexMindConnector.exe"
TARGET_DIR = os.path.join(os.environ["LOCALAPPDATA"], "ApexMind")
TARGET_EXE = os.path.join(TARGET_DIR, EXECUTABLE_NAME)

def is_installed():
    """Checks if running from the installation directory."""
    current_exe = sys.executable
    return os.path.normpath(current_exe) == os.path.normpath(TARGET_EXE)

class InstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{APP_NAME} Installer")
        self.root.geometry("400x180")
        self.root.resizable(False, False)
        
        # Center window
        self.center_window()
        
        # Styles
        style = ttk.Style()
        style.configure("TProgressbar", thickness=20)

        # UI Elements
        self.label = ttk.Label(root, text=f"Installing {APP_NAME}...", font=("Segoe UI", 12))
        self.label.pack(pady=20)

        self.progress = ttk.Progressbar(root, orient="horizontal", length=350, mode="determinate")
        self.progress.pack(pady=10)

        self.status = ttk.Label(root, text="Initializing...", font=("Segoe UI", 9), foreground="gray")
        self.status.pack(pady=5)

        # Start installation in a separate thread
        self.install_thread = threading.Thread(target=self.run_installation)
        self.install_thread.start()

    def center_window(self):
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')

    def update_status(self, text, value):
        self.status.config(text=text)
        self.progress['value'] = value
        self.root.update_idletasks()

import pythoncom

# ... (rest of imports)

    def run_installation(self):
        try:
            pythoncom.CoInitialize() # Initialize COM for this thread
            
            self.update_status("Creating directories...", 10)
            time.sleep(0.5)
            if not os.path.exists(TARGET_DIR):
                os.makedirs(TARGET_DIR)

            self.update_status("Copying files...", 30)
            time.sleep(0.5)
            current_exe = sys.executable
            shutil.copy2(current_exe, TARGET_EXE)
            
            self.update_status("Creating shortcuts...", 60)
            time.sleep(0.5)
            self.create_shortcut("Desktop", winshell.desktop())
            self.create_shortcut("StartMenu", winshell.programs())

            self.update_status("Finalizing...", 90)
            time.sleep(1)
            
            self.update_status("Installation Complete!", 100)
            time.sleep(0.5)
            
            # Launch and Exit
            os.startfile(TARGET_EXE)
            
            pythoncom.CoUninitialize() # Cleanup
            self.root.quit()
            
        except Exception as e:
            messagebox.showerror("Installation Failed", str(e))
            pythoncom.CoUninitialize()
            self.root.quit()

    def create_shortcut(self, name, folder):
        path = os.path.join(folder, f"{APP_NAME}.lnk")
        shell = Dispatch('WScript.Shell')
        shortcut = shell.CreateShortCut(path)
        shortcut.Targetpath = TARGET_EXE
        shortcut.WorkingDirectory = TARGET_DIR
        shortcut.IconLocation = TARGET_EXE
        shortcut.save()

def install():
    if is_installed():
        return

    root = tk.Tk()
    app = InstallerGUI(root)
    root.mainloop()
    sys.exit(0)
