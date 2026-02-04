from PyInstaller.utils.hooks import collect_submodules
import os

block_cipher = None

# Get absolute path to the spec file directory
spec_root = os.path.abspath(os.getcwd())

# Explicitly list all submodules to avoid recursion issues
explicit_agent_imports = [
    'agent',
    'agent.core',
    'agent.gui',
    'agent.config',
    'agent.api',
    'agent.updater',
    'agent.irsdk',
    'agent.telemetry'
]

a = Analysis(
    ['main.py'],
    pathex=[spec_root],
    binaries=[],
    datas=[('agent', 'agent')],
    hiddenimports=explicit_agent_imports + ['pystray', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'winshell', 'win32com.client', 'pythoncom', 'uuid', 'json', 'requests', 'sys', 'os', 'threading', 'logging', 'webbrowser', 'shutil', 'subprocess', 'tkinter', 'traceback'],
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
    [],
    exclude_binaries=True,
    name='ApexMindAgent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='ApexMind',
)

