# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['installer/install.py'],
    pathex=[],
    binaries=[],
    datas=[('dist/ApexMind', 'ApexMind')], # Include the built Agent folder!
    hiddenimports=['winshell', 'win32com.client', 'pythoncom', 'ctypes', 'shutil', 'subprocess', 'tkinter'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ApexMindSetup_v2.0.0',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False, # GUI Installer (hidden console)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico',
    uac_admin=True # Request Admin on launch
)
