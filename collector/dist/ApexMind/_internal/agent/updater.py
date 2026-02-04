import requests
import os
import logging
from .config import VERSION_URL, CURRENT_VERSION

def check_for_updates():
    """
    Checks if a newer version is available.
    Returns: (download_url: str | None, new_version: str | None)
    """
    try:
        resp = requests.get(VERSION_URL, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            remote_version = data.get("version")
            download_url = data.get("url")
            
            if remote_version and remote_version != CURRENT_VERSION:
                return download_url, remote_version
    except Exception as e:
        logging.error(f"Update Check Failed: {e}")
    
    return None, None

def download_installer(url, target_path):
    """
    Downloads the installer to the target path.
    """
    try:
        logging.info(f"Downloading update from {url} to {target_path}...")
        resp = requests.get(url, stream=True, timeout=30)
        if resp.status_code == 200:
            with open(target_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            logging.info("Download complete.")
            return True
    except Exception as e:
        logging.error(f"Download Failed: {e}")
    return False
