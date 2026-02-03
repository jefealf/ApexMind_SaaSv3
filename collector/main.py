import sys
import os
import time
import traceback

def setup_app():
    # Lazy imports to ensure crash handler catches ImportErrors
    try:
        print("Initializing ApexMind Agent...")
        
        # Standard Libs
        global threading, logging, webbrowser, Image, ImageDraw, pystray
        import threading
        import logging
        import webbrowser
        
        # Third Party
        print("Loading dependencies...")
        from PIL import Image, ImageDraw
        import pystray

        # Local Modules
        print("Loading modules...")
        import installer
        import updater
        
        # Logging Setup
        LOG_DIR = os.path.join(os.environ["LOCALAPPDATA"], "ApexMind")
        if not os.path.exists(LOG_DIR):
            try:
                os.makedirs(LOG_DIR)
            except:
                pass 

        LOG_FILE = os.path.join(LOG_DIR, "agent.log")
        logging.basicConfig(
            filename=LOG_FILE,
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

        app_name = "ApexMind Agent"
        current_version = "1.0.1"
        updater.CURRENT_VERSION = current_version
        dashboard_url = "http://localhost:3000/link-device"

        logging.info("--------------------------------------------------")
        logging.info(f"Agent Starting... v{current_version}")
        logging.info(f"Execution Path: {sys.executable}")

        # 1. Self-Installation Check
        if not installer.is_installed():
            logging.info("Not installed. Launching GUI Installer...")
            installer.install()
            logging.info("Installer finished. Exiting temporary process.")
            return

        # 2. Update Check
        logging.info("Checking for startup updates...")
        download_url, new_version = updater.check_for_updates(current_version)
        if download_url:
            logging.info("Update found on startup. Updating...")
            updater.update_agent(download_url)
            return

        # 3. Main Logic
        def create_icon():
            width = 64
            height = 64
            image = Image.new('RGB', (width, height), (33, 37, 41))
            dc = ImageDraw.Draw(image)
            dc.rectangle((16, 16, 48, 48), fill=(0, 255, 255))
            return image

        def on_connect(icon, item):
            logging.info("Opening dashboard...")
            webbrowser.open(dashboard_url)

        def on_exit(icon, item):
            logging.info("Exiting agent...")
            icon.stop()
            os._exit(0)

        def background_loop(icon):
            logging.info("Background loop started.")
            last_update_check = 0
            while True:
                try:
                    if time.time() - last_update_check > 3600:
                        logging.debug("Checking for updates...")
                        d_url, n_ver = updater.check_for_updates(current_version)
                        if d_url:
                           logging.info(f"Update found: {n_ver}")
                           icon.notify(f"Downloading update {n_ver}...", title="ApexMind Update")
                           updater.update_agent(d_url)
                        last_update_check = time.time()
                    time.sleep(2)
                except Exception as e:
                    logging.error(f"Error in background loop: {e}")
                    time.sleep(5)

        logging.info("Initializing Tray Icon...")
        icon_image = create_icon()
        
        status_text = f"ApexMind Agent v{current_version}"
        
        menu = pystray.Menu(
            pystray.MenuItem(status_text, lambda: None, enabled=False),
            pystray.MenuItem('Status: Waiting for iRacing', lambda: None),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Connect Account', on_connect),
            pystray.MenuItem('Exit', on_exit)
        )

        icon = pystray.Icon("ApexMind", icon_image, app_name, menu)
        
        t = threading.Thread(target=background_loop, args=(icon,), daemon=True)
        t.start()

        logging.info("Entering Tray Icon Loop.")
        icon.run()

    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        traceback.print_exc()
        if 'logging' in locals():
            logging.critical(f"FATAL ERROR: {e}", exc_info=True)
        input("\nPress Enter to exit...")

if __name__ == "__main__":
    try:
        setup_app()
    except Exception as e:
        print(f"\nFATAL BOOTSTRAP ERROR: {e}")
        traceback.print_exc()
        input("\nPress Enter to exit...")
