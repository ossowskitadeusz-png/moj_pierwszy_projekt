@echo off
echo ==============================================
echo   ERCC - Engine Room Command Center
echo ==============================================
echo.
echo Uruchamianie serwera Node.js...
start "ERCC Server" cmd /c "node server.js"

echo Czekam 2 sekundy na start serwera...
timeout /t 2 /nobreak > nul

echo Otwieranie przegladarki...
start http://localhost:3000/ercc_chief.html
start http://localhost:3000/ercc_layout.html

echo.
echo Gotowe! Aby zatrzymac serwer, po prostu zamknij czarne okno "ERCC Server".
pause
