$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) 'rip-dev'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

function Test-ApiReady {
  try {
    return (Invoke-RestMethod -Uri 'http://localhost:5000/health' -TimeoutSec 2).status -eq 'ok'
  } catch {
    return $false
  }
}

function Test-FrontendReady {
  try {
    return (Invoke-WebRequest -Uri 'http://localhost:5173/' -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-ProjectProcess($name, $workingDirectory, $arguments) {
  $stdoutPath = Join-Path $tempDir "$name.stdout.log"
  $stderrPath = Join-Path $tempDir "$name.stderr.log"
  Start-Process -FilePath 'npm.cmd' -ArgumentList $arguments -WorkingDirectory $workingDirectory `
    -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath | Out-Null
}

Write-Host 'Starting database services...'
Push-Location $projectRoot
try {
  docker compose up -d
} finally {
  Pop-Location
}

$ollamaReady = $false
try {
  $null = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 3
  $ollamaReady = $true
} catch {
  $ollamaCommand = Get-Command 'ollama.exe' -ErrorAction SilentlyContinue
  if ($ollamaCommand) {
    $ollamaOut = Join-Path $tempDir 'ollama.stdout.log'
    $ollamaErr = Join-Path $tempDir 'ollama.stderr.log'
    Start-Process -FilePath $ollamaCommand.Source -ArgumentList 'serve' -WindowStyle Hidden `
      -RedirectStandardOutput $ollamaOut -RedirectStandardError $ollamaErr | Out-Null
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      Start-Sleep -Seconds 1
      try {
        $null = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 2
        $ollamaReady = $true
        break
      } catch { }
    }
  }
}

if (-not $ollamaReady) {
  throw 'Ollama is unavailable at http://localhost:11434. Start Ollama before running ATS analysis.'
}

$modelName = 'qwen2.5:7b-instruct'
$modelSetting = Select-String -Path (Join-Path $backendDir '.env') -Pattern '^OLLAMA_CHAT_MODEL=' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($modelSetting) { $modelName = ($modelSetting.Line -split '=', 2)[1].Trim() }
$ollamaTags = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5
if ($ollamaTags.models.name -notcontains $modelName) {
  throw "Ollama model '$modelName' is missing. Install it with: ollama pull $modelName"
}

if (-not (Test-ApiReady)) {
  Write-Host 'Starting backend API...'
  Start-ProjectProcess 'backend' $backendDir @('run', 'dev')
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-ApiReady) { break }
  }
  if (-not (Test-ApiReady)) {
    throw "Backend did not become healthy. Check $tempDir\backend.stderr.log"
  }
}

if (-not (Test-FrontendReady)) {
  Write-Host 'Starting frontend...'
  Start-ProjectProcess 'frontend' $frontendDir @('run', 'dev', '--', '--host', '127.0.0.1')
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-FrontendReady) { break }
  }
  if (-not (Test-FrontendReady)) {
    throw "Frontend did not become ready. Check $tempDir\frontend.stderr.log"
  }
}

Write-Host 'RIP development services are ready:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend:  http://localhost:5000/health'
Write-Host '  Ollama:   http://localhost:11434'
