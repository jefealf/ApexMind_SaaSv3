import sys
import os
import shutil
import subprocess
import ctypes
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import winshell
from win32com.client import Dispatch
import pythoncom

# CONFIG
APP_NAME = "ApexMind Agent"
INSTALL_DIR = r"C:\Program Files\ApexMind"
EXE_NAME = "ApexMindAgent.exe"
SOURCE_DIR = "ApexMind" # Name of folder inside _MEIPASS

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

class InstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{APP_NAME} Installer")
        self.root.geometry("400x200")
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

    def run_installation(self):
        try:
            pythoncom.CoInitialize() # Initialize COM for this thread
            
            # --- 1. Stop Running Instance ---
            self.update_status("Stopping running agent...", 10)
            subprocess.call(f"taskkill /F /IM {EXE_NAME}", shell=True)
            time.sleep(1)

            # --- 2. Create Target Directory ---
            self.update_status("Creating directories...", 20)
            if not os.path.exists(INSTALL_DIR):
                os.makedirs(INSTALL_DIR)
            else:
                # Clean existing directory to ensure fresh install
                try:
                    shutil.rmtree(INSTALL_DIR)
                    time.sleep(1)
                    os.makedirs(INSTALL_DIR)
                except Exception as e:
                     print(f"Warning cleaning dir: {e}")

            # --- 3. Determine Source ---
            if getattr(sys, 'frozen', False):
                base_path = sys._MEIPASS
            else:
                base_path = os.path.dirname(os.path.abspath(__file__))
            
            source_path = os.path.join(base_path, SOURCE_DIR)
            
            if not os.path.exists(source_path):
                 raise Exception(f"Source files not found at: {source_path}")

            # --- 4. Copy Files ---
            self.update_status("Copying files...", 40)
            
            total_items = len(os.listdir(source_path))
            count = 0
            
            for item in os.listdir(source_path):
                s = os.path.join(source_path, item)
                d = os.path.join(INSTALL_DIR, item)
                if os.path.isdir(s):
                    shutil.copytree(s, d)
                else:
                    shutil.copy2(s, d)
                
                count += 1
                progress = 40 + int((count / total_items) * 40) # 40% to 80%
                self.update_status(f"Copying {item}...", progress)
                time.sleep(0.05) # Visual delay

            # --- 5. Create Shortcuts ---
            self.update_status("Creating shortcuts...", 85)
            target_exe = os.path.join(INSTALL_DIR, EXE_NAME)
            self.create_shortcut("Desktop", winshell.desktop(), target_exe)
            self.create_shortcut("StartMenu", winshell.programs(), target_exe)

            # --- 6. Finalize ---
            self.update_status("Finalizing...", 95)
            time.sleep(1)
            
            self.update_status("Installation Complete!", 100)
            time.sleep(0.5)
            
            # Launch and Exit
            subprocess.Popen([target_exe], cwd=INSTALL_DIR)
            
            pythoncom.CoUninitialize() # Cleanup
            self.root.quit()
            
        except Exception as e:
            messagebox.showerror("Installation Failed", str(e))
            pythoncom.CoUninitialize()
            self.root.quit()

    def create_shortcut(self, name, folder, target_exe):
        try:
            path = os.path.join(folder, f"{APP_NAME}.lnk")
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(path)
            shortcut.Targetpath = target_exe
            shortcut.WorkingDirectory = os.path.dirname(target_exe)
            shortcut.IconLocation = target_exe
            shortcut.save()
        except Exception as e:
             print(f"Failed to create shortcut in {folder}: {e}")

def main():
    if not is_admin():
        # Re-run with Admin
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        sys.exit()

    root = tk.Tk()
    app = InstallerGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
