import requests
import time
import logging
from .config import API_URL

def check_link_status_api(device_id):
    """
    Polls the backend API to check if the device is linked.
    Returns: (is_linked: bool, display_name: str)
    """
    try:
        url = f"{API_URL}/devices/{device_id}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            is_linked = data.get("linked", False)
            display_name = data.get("display_name") or data.get("user_id", "Connected User")
            return is_linked, display_name
    except Exception as e:
        return False, "Unknown"

def update_career_stats(device_id, stats):
    """
    Sends career stats (irating, sr, license) to the backend.
    """
    try:
        payload = {
            "device_id": device_id,
            "irating": stats.get("irating", 0),
            "safety_rating": stats.get("safety_rating", 0.0),
            "license_class": stats.get("license_class", "")
        }
        resp = requests.post(f"{API_URL}/telemetry/career", json=payload, timeout=5)
        return resp.status_code == 200
    except Exception as e:
        logging.error(f"API Error: {e}")
        return False
