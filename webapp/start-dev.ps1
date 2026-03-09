# TeamDX Dev Server - Run this in PowerShell (close Cursor first if npm install fails)
Set-Location $PSScriptRoot

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed. Try: Close Cursor, open PowerShell as Admin, run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "Starting dev server..." -ForegroundColor Green
npx next dev
