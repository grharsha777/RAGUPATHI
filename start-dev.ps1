# RAGHUPATI Development Stack Bootstrapper
# This script launches both the Next.js frontend and the managed FastAPI backend.

Write-Host "[x] Starting RAGHUPATI DevSecOps Stack..." -ForegroundColor Cyan

# 1. Start Backend in a new job/process
Write-Host "[Backend] Bootstrapping FastAPI..." -ForegroundColor Green
$backendDir = Join-Path $PSScriptRoot "raghupati-backend"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; & '.\.venv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -PassThru | Out-Null

# 2. Start Frontend in the current terminal (keeps logs visible)
Write-Host "[Frontend] Bootstrapping Next.js..." -ForegroundColor Magenta
$frontendDir = Join-Path $PSScriptRoot "raghupati-frontend"
Set-Location $frontendDir
npm run dev
