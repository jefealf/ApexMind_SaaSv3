@echo off
echo Building ApexMind Agent...
pip install pyinstaller pystray pillow requests winshell pywin32

echo Cleaning old builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo Building Agent (OnDir Mode)...
pyinstaller build.spec

echo Building Installer...
pyinstaller setup.spec

echo Done!
echo - Agent: dist\ApexMind\ApexMindAgent.exe
echo - Installer: dist\ApexMindSetup_v2.0.0.exe
pause
