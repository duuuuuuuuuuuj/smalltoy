@echo off
cd /d "%~dp0"
REM Load mise if available (scoop install)
where mise >nul 2>&1
if %errorlevel%==0 (
    for /f "delims=" %%i in ('mise where node 2^>nul') do set "PATH=%%i;%%i\..;%PATH%"
) else (
    if exist "%USERPROFILE%\scoop\apps\mise\current\bin\mise.exe" (
        for /f "delims=" %%i in ('"%USERPROFILE%\scoop\apps\mise\current\bin\mise.exe" where node 2^>nul') do set "PATH=%%i;%%i\..;%PATH%"
    )
)
where node >nul 2>&1 || (
    echo ERROR: Node.js not found. Install via mise or add to PATH.
    pause
    exit /b 1
)
echo Starting Claude Pet...
npx electron . 2>&1
echo.
echo Exited with code %errorlevel%
pause
