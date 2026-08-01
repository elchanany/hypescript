@echo off
rem מפעיל את הממשק הגרפי של hypescript (ללא חלון שחור).
cd /d "%~dp0"
start "" pythonw -m hypescript.gui
