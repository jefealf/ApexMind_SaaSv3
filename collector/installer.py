import os
import sys
import shutil
import winshell
from win32com.client import Dispatch

APP_NAME = "ApexMind Agent"
EXECUTABLE_NAME = "ApexMindConnector.exe"
TARGET_DIR = os.path.join(os.environ["LOCALAPPDATA"], "ApexMind")
TARGET_EXE = os.path.join(TARGET_DIR, EXECUTABLE_NAME)

def is_installed():
    """Checks if running from the installation directory."""
    current_exe = sys.executable
    return os.path.normpath(current_exe) == os.path.normpath(TARGET_EXE)

def install():
    """Installs the agent to %LOCALAPPDATA% and creates shortcuts."""
    if is_installed():
        return

    print(f"Installing {APP_NAME}...")
    
    # 1. Create Target Directory
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)

    # 2. Copy Executable
    current_exe = sys.executable
    try:
        shutil.copy2(current_exe, TARGET_EXE)
    except Exception as e:
        print(f"Failed to copy executable: {e}")
        return

    # 3. Create Shortcuts
    create_shortcut("Desktop", winshell.desktop())
    create_shortcut("StartMenu", winshell.programs())

    # 4. Launch Installed Version
    print("Launching installed version...")
    os.startfile(TARGET_EXE)
    sys.exit(0)

def create_shortcut(name, folder):
    """Creates a shortcut in the specified folder."""
    path = os.path.join(folder, f"{APP_NAME}.lnk")
    shell = Dispatch('WScript.Shell')
    shortcut = shell.CreateShortCut(path)
    shortcut.Targetpath = TARGET_EXE
    shortcut.WorkingDirectory = TARGET_DIR
    shortcut.IconLocation = TARGET_EXE
    shortcut.save()
    print(f"Shortcut created: {path}")
