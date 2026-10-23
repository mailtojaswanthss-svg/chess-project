$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path

$pythonPath = Join-Path $project ".maia-venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    $pythonPath = Join-Path $project ".venv\Scripts\python.exe"
}
if (-not (Test-Path $pythonPath)) {
    throw "Python virtual environment not found. Create it with: python -m venv .venv"
}
if (-not (Test-Path (Join-Path $project "frontend\package.json"))) {
    throw "Frontend project not found: $project\frontend"
}

$localAddresses = @(Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
    Select-Object -ExpandProperty IPAddress)
if (-not $localAddresses) {
    $localAddresses = @("127.0.0.1")
}
$localAddress = $localAddresses[0]
$networkOrigins = ($localAddresses | ForEach-Object { "http://$($_):5173" }) -join ","
$frontendOrigins = "http://localhost:5173,http://127.0.0.1:5173,$networkOrigins"

Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "`$env:FRONTEND_ORIGINS='$frontendOrigins'; Set-Location -LiteralPath '$project'; & '$pythonPath' -m uvicorn chess_trainer.api:app --host 0.0.0.0 --port 8000"
)

Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location -LiteralPath '$project\frontend'; npm run dev -- --host 0.0.0.0"
)

Start-Sleep -Seconds 3
Start-Process "http://$localAddress`:5173/"
