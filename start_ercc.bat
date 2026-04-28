@echo off
echo ==============================================
echo   ERCC - Engine Room Command Center (SPA)
echo ==============================================
echo.
echo [1/3] Uruchamianie serwera backendowego...
start "ERCC_SERVER" cmd /c "npm start"

echo [2/3] Czekam na inicjalizacje bazy danych...
timeout /t 3 /nobreak > nul

echo [3/3] Otwieranie Dashboardu w przegladarce...
start http://localhost:3000

echo.
echo ==============================================
echo   SYSTEM GOTOWY! 
echo   Zaloguj sie jako: jose.santos / pass123
echo ==============================================
echo.
pause
