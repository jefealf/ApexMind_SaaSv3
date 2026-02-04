import tkinter as tk
from tkinter import ttk, scrolledtext
import logging
import webbrowser
import threading
import datetime
from .config import *

# Logging Handler to redirect logs to GUI
class TextHandler(logging.Handler):
    def __init__(self, text_widget):
        super().__init__()
        self.text_widget = text_widget

    def emit(self, record):
        msg = self.format(record)
        def append():
            self.text_widget.configure(state='normal')
            self.text_widget.insert(tk.END, msg + '\n')
            self.text_widget.see(tk.END)
            self.text_widget.configure(state='disabled')
        
        # Schedule update in main thread
        self.text_widget.after(0, append)

class StatusWindow:
    def __init__(self, root, device_id, check_link_status_callback, hide_callback):
        self.root = root
        self.device_id = device_id
        self.hide_callback = hide_callback
        
        self.root.title(APP_NAME)
        self.root.geometry("500x550") # Taller for logs
        self.root.configure(bg=BG_COLOR)
        # self.root.resizable(False, False) # Allow resizing for logs
        
        # Icons (using unicode for simplicity, can be replaced with images)
        self.ICON_CONNECTED = "🟢"
        self.ICON_DISCONNECTED = "🔴"
        
        # State
        self.is_linked = False
        self.linked_username = "Guest"
        
        self.center_window()
        self.build_ui()
        
        # Setup Logging
        self.setup_logging()
        
        # Protocol
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)

    def center_window(self):
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f'{w}x{h}+{x}+{y}')

    def build_ui(self):
        # --- HEADER ---
        header_frame = tk.Frame(self.root, bg=BG_COLOR)
        header_frame.pack(fill="x", pady=(20, 10), padx=20)
        
        lbl_title = tk.Label(header_frame, text="APEXMIND", font=("Segoe UI", 16, "bold"), bg=BG_COLOR, fg=FG_COLOR)
        lbl_title.pack(side="left")

        self.lbl_ver = tk.Label(header_frame, text=f"v{CURRENT_VERSION}", font=("Consolas", 9), bg=BG_COLOR, fg="#64748b")
        self.lbl_ver.pack(side="left", padx=10, pady=(4,0))
        
        self.lbl_status_badge = tk.Label(header_frame, text="OFFLINE", font=("Segoe UI", 9, "bold"), bg=BG_COLOR, fg="#64748b", padx=8, pady=2, relief="solid", bd=1)
        self.lbl_status_badge.pack(side="right")
        
        # --- STATUS CARD ---
        card_frame = tk.Frame(self.root, bg=CARD_BG, highlightbackground="#334155", highlightthickness=1)
        card_frame.pack(fill="x", padx=20, pady=10, ipady=10)
        
        # Columns
        left_col = tk.Frame(card_frame, bg=CARD_BG)
        left_col.pack(side="left", padx=20)
        
        tk.Label(left_col, text="USER", font=("Segoe UI", 8, "bold"), fg="#64748b", bg=CARD_BG).pack(anchor="w")
        self.val_user = tk.Label(left_col, text="Waiting...", font=("Segoe UI", 11), fg=FG_COLOR, bg=CARD_BG)
        self.val_user.pack(anchor="w")
        
        tk.Label(left_col, text="DEVICE ID", font=("Segoe UI", 8, "bold"), fg="#64748b", bg=CARD_BG).pack(anchor="w", pady=(10,0))
        # Masked ID
        short_id = f"{self.device_id[:4]}...{self.device_id[-4:]}"
        self.val_id = tk.Label(left_col, text=short_id, font=("Consolas", 10), fg="#94a3b8", bg=CARD_BG)
        self.val_id.pack(anchor="w")
        
        # Right Col (Action)
        right_col = tk.Frame(card_frame, bg=CARD_BG)
        right_col.pack(side="right", padx=20)
        
        self.btn_status = tk.Button(right_col, text="OPEN DASHBOARD", bg=ACCENT_COLOR, fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=15, pady=8, cursor="hand2", command=self.open_dashboard)
        self.btn_status.pack()

        # --- LOG CONSOLE ---
        console_label = tk.Label(self.root, text="ACTIVITY LOG", font=("Segoe UI", 8, "bold"), bg=BG_COLOR, fg="#64748b")
        console_label.pack(anchor="w", padx=22, pady=(15, 5))

        self.console_frame = tk.Frame(self.root, bg="#000000", highlightbackground="#334155", highlightthickness=1)
        self.console_frame.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        self.log_widget = scrolledtext.ScrolledText(self.console_frame, state='disabled', height=10, bg="#0a0a0a", fg="#22c55e", font=("Consolas", 9), relief="flat", padx=10, pady=10)
        self.log_widget.pack(fill="both", expand=True)
        
        # Tag configuration for colors
        self.log_widget.tag_config("INFO", foreground="#22c55e") # Green
        self.log_widget.tag_config("WARNING", foreground="#f59e0b") # Orange
        self.log_widget.tag_config("ERROR", foreground="#ef4444") # Red

    def setup_logging(self):
        # Create handler
        handler = TextHandler(self.log_widget)
        formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S')
        handler.setFormatter(formatter)
        
        # Add to root logger
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)
        
        logging.info(f"Agente iniciado. Versão {CURRENT_VERSION}.")
        logging.info(f"Device ID: {self.device_id}")

    def update_state(self, is_linked, username):
        if is_linked != self.is_linked or username != self.linked_username:
            self.is_linked = is_linked
            self.linked_username = username
            
            if self.is_linked:
                self.val_user.config(text=self.linked_username, fg="#22c55e")
                self.lbl_status_badge.config(text="ONLINE", fg="#22c55e", highlightbackground="#22c55e")
                self.btn_status.config(text="DASHBOARD", bg=CARD_BG, fg="#22c55e", borderwidth=1, relief="solid")
                logging.info(f"Sincronizado com: {username}")
            else:
                self.val_user.config(text="Guest (Not Linked)", fg="#94a3b8")
                self.lbl_status_badge.config(text="OFFLINE", fg="#64748b", highlightbackground="#64748b")
                self.btn_status.config(text="LINK DEVICE", bg=ACCENT_COLOR, fg="white", relief="flat")
                logging.warning("Dispositivo não vinculado.")

    def open_dashboard(self):
        url = f"{DASHBOARD_URL}?deviceId={self.device_id}"
        webbrowser.open(url)
        logging.info("Abrindo painel de controle...")

    def hide_window(self):
        if self.hide_callback:
            self.hide_callback()
    
    def show(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
