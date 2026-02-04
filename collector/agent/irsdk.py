import mmap
import struct
import ctypes
import time
import yaml

# Constants
MEMMAPFILE = "Local\\IRSDKMemMapFileName"
BROADCASTMSGNAME = "IRSDK_BROADCASTMSG"

# Status Flags
irsdk_stConnected = 1

class IRSDK:
    def __init__(self):
        self.last_update = -1
        self.socket = None
        self.header = None
        self.var_headers = {}
        self.var_buffer = None
        self.session_info = {}

    def startup(self):
        """Attempts to connect to the shared memory map."""
        try:
            self.socket = mmap.mmap(0, 32, MEMMAPFILE, access=mmap.ACCESS_READ)
            # Read minimal header to get full size
            self.socket.seek(0)
            # h_ver, h_status, h_tickRate, h_sesInfoUpdate, h_sesInfoLen, h_sesInfoOffset, h_numVars, h_varHeaderOffset, h_numBuf, h_bufLen
            # We just need to ensure it exists.
            self.socket.close() 
            
            # Now allow full access (guess size purely) or keep re-opening. 
            # Ideally we read header, get size, then re-map.
            # Simplified: Map large enough chunk.
            self.socket = mmap.mmap(0, 10000000, MEMMAPFILE, access=mmap.ACCESS_READ) 
            return True
        except Exception:
            return False

    def shutdown(self):
        if self.socket:
            self.socket.close()
            self.socket = None

    @property
    def is_connected(self):
        if not self.socket:
            return False
        # Read status from header (offset 4, int)
        self.socket.seek(4)
        status = struct.unpack('i', self.socket.read(4))[0]
        return (status & irsdk_stConnected) > 0

    def parse_header(self):
        if not self.socket: return
        self.socket.seek(0)
        # int ver, int status, int tickRate, int sesInfoUpdate, int sesInfoLen, int sesInfoOffset, int numVars, int varHeaderOffset, int numBuf, int bufLen
        data = struct.unpack('10i', self.socket.read(40))
        self.header = {
            'ver': data[0],
            'status': data[1],
            'tickRate': data[2],
            'sesInfoUpdate': data[3],
            'sesInfoLen': data[4],
            'sesInfoOffset': data[5],
            'numVars': data[6],
            'varHeaderOffset': data[7],
            'numBuf': data[8],
            'bufLen': data[9]
        }
        
    def get_session_info(self):
        """Reads and parses the YAML SessionInfo."""
        if not self.header: self.parse_header()
        if not self.socket or not self.header: return {}
        
        offset = self.header['sesInfoOffset']
        length = self.header['sesInfoLen']
        
        self.socket.seek(offset)
        raw_yaml = self.socket.read(length).decode('latin-1').rstrip('\x00')
        
        try:
            self.session_info = yaml.safe_load(raw_yaml)
        except:
            self.session_info = {}
            
        return self.session_info

    def get_latest_var_buffer(self):
        """Finds the most recent data buffer."""
        # Buffer headers are at 48 (12 ints * 4) ? header is 10 ints?
        # Header is 112 bytes struct usually? Python's struct.unpack above was simplified.
        # Let's use strict offsets.
        # h_ver(0), h_status(4), h_tick(8), h_sesUp(12), h_sesLen(16), h_sesOff(20), h_numVars(24), h_varOff(28), h_numBuf(32), h_bufLen(36)
        # 10 ints = 40 bytes.
        # Next comes pad? No, immediately varBuf headers? 
        # C struct has 3 ints padding.
        
        # Proper offset for VarBuf headers is 48.
        # Each VarBuf header: int tickCount(0), int bufOffset(4), 2 ints padding. (16 bytes)
        
        count = self.header['numBuf']
        best_tick = -1
        best_idx = -1
        
        for i in range(count):
            self.socket.seek(48 + (i * 16))
            tick, offset = struct.unpack('ii', self.socket.read(8))
            if tick > best_tick:
                best_tick = tick
                best_idx = i
                
        if best_idx == -1: return None
        
        # Get offset again
        self.socket.seek(48 + (best_idx * 16) + 4)
        offset = struct.unpack('i', self.socket.read(4))[0]
        
        self.socket.seek(offset)
        return self.socket.read(self.header['bufLen'])

# Usage Singleton
try:
    ir = IRSDK()
except:
    ir = None
