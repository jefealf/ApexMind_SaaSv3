import pystray
from PIL import Image, ImageDraw
import webbrowser
import threading
import time
import os
import sys

# Import new modules
import installer
import updater

# Constants
APP_NAME = "ApexMind Agent"
DASHBOARD_URL = "http://localhost:3000/link-device"

# Current Version (Bump this manually or via CI/CD)
CURRENT_VERSION = "1.0.1"
updater.CURRENT_VERSION = CURRENT_VERSION

def create_icon():
    """Generates a simple tray icon (placeholder)."""
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), (33, 37, 41))
    dc = ImageDraw.Draw(image)
    dc.rectangle((16, 16, 48, 48), fill=(0, 255, 255)) # Cyan box
    return image

def on_connect(icon, item):
    """Action for 'Connect Account' menu item."""
    webbrowser.open(DASHBOARD_URL)

def on_exit(icon, item):
    """Action for 'Exit' menu item."""
    icon.stop()
    os._exit(0)

def background_loop(icon):
    """Simulates the background telemetry collection and update check."""
    
    # Check for updates periodically (e.g. every hour)
    last_update_check = 0
    
    while True:
        # 1. Update Check Logic
        if time.time() - last_update_check > 3600: # 1 hour
            download_url, new_version = updater.check_for_updates(CURRENT_VERSION)
            if download_url:
                print(f"Update available: {new_version}")
                icon.notify(f"Downloading update {new_version}...", title="ApexMind Update")
                updater.update_agent(download_url)
            last_update_check = time.time()

        # 2. Telemetry Logic (Placeholder)
        # Check iRacing status...
        time.sleep(2)

def setup_app():
    # 1. Self-Installation Check
    # If not installed, install and exit.
    if not installer.is_installed():
        installer.install()
        return

    # 2. Startup Update Check (Immediate)
    download_url, new_version = updater.check_for_updates(CURRENT_VERSION)
    if download_url:
        updater.update_agent(download_url)
        return

    # 3. Normal Startup
    icon_image = create_icon()
    
    status_text = f"ApexMind Agent v{CURRENT_VERSION}"
    
    menu = pystray.Menu(
        pystray.MenuItem(status_text, lambda: None, enabled=False),
        pystray.MenuItem('Status: Waiting for iRacing', lambda: None),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Connect Account', on_connect),
        pystray.MenuItem('Exit', on_exit)
    )

    icon = pystray.Icon("ApexMind", icon_image, APP_NAME, menu)
    
    # Start background thread
    t = threading.Thread(target=background_loop, args=(icon,), daemon=True)
    t.start()

    icon.run()

if __name__ == "__main__":
    setup_app()
