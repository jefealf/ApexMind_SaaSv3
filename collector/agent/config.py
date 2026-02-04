import os

# =================================================================================
# CONSTANTS & CONFIG
# =================================================================================
APP_NAME = "ApexMind Agent"
EXECUTABLE_NAME = "ApexMindAgent.exe" # New Name
# PRODUCTION URL
DASHBOARD_URL = "https://apexmindsaasv3.vercel.app/link-device" 
VERSION_URL = "https://apexmindsaasv3.vercel.app/download/version.json"
API_URL = "https://apexmind-saasv3.onrender.com"
CURRENT_VERSION = "2.0.0" # Major bump for refactor

# Colors (Dark Theme)
BG_COLOR = "#0f172a"     # Slate 900
FG_COLOR = "#f8fafc"     # Slate 50
ACCENT_COLOR = "#06b6d4" # Cyan 500
CARD_BG = "#1e293b"      # Slate 800

# Paths - Updated for Program Files / OneDir
# If frozen (exe), we are in dist/ApexMind/
# We want data to be in %AppData%/ApexMind for persistence
APPDATA_DIR = os.path.join(os.environ["LOCALAPPDATA"], "ApexMind")
LOG_FILE = os.path.join(APPDATA_DIR, "agent.log")
CONFIG_FILE = os.path.join(APPDATA_DIR, "config.json")


# Ensure AppData exists
if not os.path.exists(APPDATA_DIR):
    try:
        os.makedirs(APPDATA_DIR)
    except:
        pass

# Load or Generate DEVICE_ID
def get_device_id():
    import json
    import uuid
    
    device_id = None
    
    # Try to load from config file
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                device_id = data.get("device_id")
        except:
            pass
            
    # Generate if missing
    if not device_id:
        device_id = str(uuid.uuid4())
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump({"device_id": device_id}, f)
        except:
            pass # Use ephemeral ID if write fails
            
    return device_id

DEVICE_ID = get_device_id()

