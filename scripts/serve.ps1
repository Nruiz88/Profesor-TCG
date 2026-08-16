param(
  [ValidateSet('dev', 'prod')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$workdir = 'D:\webs\profesortcg'
$logDir = 'C:\Users\chin0\AppData\Local\Temp\opencode'

# 1. Matar procesos node que cuelen el puerto 3000
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'next' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

# 2. Levantar el server en background (no bloquea)
$args = if ($Mode -eq 'dev') {
  'node_modules/next/dist/bin/next', 'dev'
} else {
  'node_modules/next/dist/bin/next', 'start'
}

Start-Process -FilePath 'node' `
  -ArgumentList $args `
  -WorkingDirectory $workdir `
  -RedirectStandardOutput "$logDir\next-out.log" `
  -RedirectStandardError "$logDir\next-err.log" `
  -WindowStyle Hidden

# 3. Esperar a que responda (max 40s, reintentos de 1s)
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/login' -TimeoutSec 2 -UseBasicParsing
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    # aun arrancando
  }
}

if ($ready) {
  Write-Output "server listo (mode: $Mode) en http://localhost:3000"
} else {
  Write-Output 'server NO respondio a tiempo'
  if (Test-Path "$logDir\next-err.log") {
    Get-Content "$logDir\next-err.log" -Tail 10
  }
  exit 1
}