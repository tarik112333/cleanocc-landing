@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   1 = Inscription reelle d'un client (envoi a l'URSSAF)
echo   2 = Test (verifie tout, n'envoie rien)
echo.
set /p choix="Votre choix (1 ou 2) : "
if "%choix%"=="2" (
  node scripts\inscription-avance-manuelle.js --test
) else (
  node scripts\inscription-avance-manuelle.js
)
echo.
pause
