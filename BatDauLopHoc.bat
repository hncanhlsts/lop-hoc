@echo off
chcp 65001 > nul
title CLASSLIVE - HE THONG TRINH CHIEU KHONG MAN CHIEU

echo ============================================================
echo      DANG KHOI DONG HE THONG TRINH CHIEU CHO LOP HOC
echo ============================================================
echo.

:: 1. Chay Node.js Server
start "ClassLive Server" /min cmd /c "node server\server.js"

:: Cho server khoi dong trong 2 giay
timeout /t 2 /nobreak > nul

:: 2. Tu dong mo Bang dieu khien Giao vien tren trinh duyet
start http://localhost:3000/teacher

echo [OK] May chu phat slide da san sang tai: http://localhost:3000/teacher
echo [OK] Hay de hoc sinh quet ma QR tren man hinh Bang dieu khien de vao lop.
echo.
echo ============================================================
echo DANG KET NOI VOI POWERPOINT (Tu dong nhan dien khi an F5)...
echo ============================================================
echo.

:: 3. Chay script dong bo PowerPoint
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\sync_powerpoint.ps1"

pause
