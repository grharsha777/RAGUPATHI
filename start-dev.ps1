# RAGHUPATI Development Stack Bootstrapper
# This script launches both the Next.js frontend and the managed FastAPI backend.

Write-Host "🚀 Starting RAGHUPATI DevSecOps Stack..." -ForegroundColor Cyan

# 1. Start Backend in a new job/process
Write-Host "📦 Bootstrapping Backend (FastAPI)..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd raghupati-backend; .\.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload" -PassThru

# 2. Start Frontend in the current terminal (keeps logs visible)
Write-Host "🎨 Bootstrapping Frontend (Next.js)..." -ForegroundColor Magenta
cd raghupati-frontend
npm run dev
