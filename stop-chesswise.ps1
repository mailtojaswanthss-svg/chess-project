$ErrorActionPreference = "Continue"

$ports = @(8000, 5173)
foreach ($port in $ports) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process.Id
            Write-Output ("Stopped port " + $port + " (PID " + $process.Id + ")")
        }
    }
}

Write-Output "Chesswise servers stopped."
