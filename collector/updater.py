import os
import sys
import requests
import subprocess
import time

VERSION_URL = "https://apexmind.vercel.app/download/version.json"
CURRENT_VERSION = "0.0.1" # Will be updated by main.py or build process
UPDATER_SCRIPT = "update.bat"

def check_for_updates(current_version):
    """Checks the remote server for a newer version."""
    try:
        print(f"Checking for updates... (Current: {current_version})")
        response = requests.get(VERSION_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        remote_version = data.get("version")
        download_url = data.get("url")

        if remote_version and remote_version != current_version:
            # Simple string comparison, ideally semantic versioning
            print(f"Update found: {remote_version}")
            return download_url, remote_version
    except Exception as e:
        print(f"Update check failed: {e}")
    
    return None, None

def update_agent(download_url):
    """Downloads and applies the update."""
    try:
        # 1. Download new executable
        print("Downloading update...")
        response = requests.get(download_url, stream=True)
        response.raise_for_status()
        
        new_exe = f"{sys.executable}.new"
        with open(new_exe, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # 2. Create Batch Script for Hot Swap
        current_exe = sys.executable
        batch_script = f"""
@echo off
timeout /t 2 /nobreak > NUL
del "{current_exe}"
rename "{new_exe}" "{os.path.basename(current_exe)}"
start "" "{current_exe}"
del "%~f0"
"""
        with open(UPDATER_SCRIPT, "w") as f:
            f.write(batch_script)

        # 3. Execute and Exit
        print("Restarting to apply update...")
        subprocess.Popen(UPDATER_SCRIPT, shell=True)
        sys.exit(0)

    except Exception as e:
        print(f"Update failed: {e}")
