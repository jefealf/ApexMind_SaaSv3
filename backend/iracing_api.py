import requests
import hashlib
import base64
import time

IRACING_AUTH_URL = "https://members-ng.iracing.com/auth"
IRACING_DATA_URL = "https://members-ng.iracing.com/data"

class IRacingAPI:
    def __init__(self):
        self.session = requests.Session()
    
    def login(self, username, password):
        """Authenticates with iRacing and stores the session cookies."""
        # Calculate password hash as per iRacing legacy or use plain payload for new auth
        # Current members-ng auth typically accepts JSON payload
        payload = {"email": username, "password": password}
        
        headers = {'Content-Type': 'application/json'}
        response = self.session.post(IRACING_AUTH_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            return True, "Authenticated"
        elif response.status_code == 401:
            return False, "Invalid Credentials"
        else:
            return False, f"Auth Error: {response.status_code}"

    def get_member_career(self, cust_id=None):
        """Fetches career stats (iRating, License, etc). If cust_id is None, uses logged user."""
        # 1. Get Link
        link_url = f"{IRACING_DATA_URL}/stats/member_career"
        if cust_id:
           link_url += f"?cust_id={cust_id}"
           
        resp = self.session.get(link_url)
        if resp.status_code != 200: return None
        
        # 2. Get Data from Link
        data_url = resp.json().get('link')
        if not data_url: return None
        
        data_resp = self.session.get(data_url)
        if data_resp.status_code != 200: return None
        
        return data_resp.json()

    def get_member_info(self):
        """Fetches general member info including standard stats."""
        # 1. Get Link
        link_url = f"{IRACING_DATA_URL}/member/info"
        resp = self.session.get(link_url)
        if resp.status_code != 200: return None
        
        # 2. Get Data
        data_url = resp.json().get('link')
        if not data_url: return None
        
        data_resp = self.session.get(data_url)
        if data_resp.status_code == 200:
            return data_resp.json()
        return None
