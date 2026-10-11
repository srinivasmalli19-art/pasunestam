@echo off
title Pasunestam
rem ONE-WINDOW local start. Double-click this file.
rem It runs the database (Firebase emulator) in the background of this same
rem window, loads the sample data, then starts the app and opens the browser.
rem To stop: press Ctrl+C in this window (then Y). That also stops the database
rem and saves your test data for next time.
cd /d "%~dp0"

where node >nul 2>&1 || (echo Node.js is not installed. Get the LTS version from https://nodejs.org & pause & exit /b 1)
where java >nul 2>&1 || (echo Java is not installed. Run:  winget install EclipseAdoptium.Temurin.21.JRE & pause & exit /b 1)
where firebase >nul 2>&1 || (echo Installing Firebase tools, first time only... & call npm install -g firebase-tools)

if not exist ".env.local" (
  echo Creating .env.local for the local database...
  (echo FIRESTORE_EMULATOR_HOST=127.0.0.1:8080& echo FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099)> .env.local
)

if not exist "node_modules" (
  echo Installing packages, first time only - this takes a few minutes...
  call npm install || (echo npm install failed - send a screenshot to Claude. & pause & exit /b 1)
)

rem If the database is already running from an earlier start, reuse it.
curl -s -o nul http://127.0.0.1:8080 && goto ready

echo Starting the database in the background - messages go to emulator-debug.log
start "" /b cmd /c "npm run emulators > emulator-debug.log 2>&1"

echo Waiting for the database to be ready, up to 3 minutes...
set /a tries=0
:wait
timeout /t 3 /nobreak >nul
set /a tries+=1
curl -s -o nul http://127.0.0.1:8080 && goto ready
if %tries% geq 60 goto failed
goto wait

:failed
echo.
echo The database did not start. Last lines of emulator-debug.log:
powershell -NoProfile -Command "Get-Content emulator-debug.log -Tail 25"
echo Send a screenshot of this window to Claude.
pause
exit /b 1

:ready
echo Database is ready. Loading sample certificates and content...
call npm run db:seed
call npm run db:seed:content

echo.
echo ============================================================
echo  Pasunestam is starting: http://localhost:3000
echo  Keep this window open while testing.
echo  To stop: press Ctrl+C here, then Y.
echo ============================================================
start "" cmd /c "timeout /t 12 /nobreak >nul & start http://localhost:3000"
call npm run dev
