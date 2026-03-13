@echo off
cd /d "F:\TeamDX-Sheet\webapp"
echo Checking dependencies...
if not exist "node_modules\next" (
  echo Running npm install...
  call npm install
  if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
)
echo Starting dev server...
call npm run dev
pause
