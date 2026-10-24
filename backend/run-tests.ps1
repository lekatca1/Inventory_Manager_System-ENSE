# Windows (PowerShell): downloads the SQLite driver, compiles the backend and runs all backend tests.
# Needs a JDK (Java 17+). Run from the backend folder:  .\run-tests.ps1
# If scripts are blocked, run once:  Set-ExecutionPolicy -Scope Process Bypass
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command javac -ErrorAction SilentlyContinue)) { Write-Host "javac not found. Install a JDK (Java 17 or newer) first."; exit 1 }

# 1. Download the two driver jars into lib\ (only if missing)
New-Item -ItemType Directory -Force lib | Out-Null
if (-not (Test-Path lib\sqlite-jdbc.jar)) { Invoke-WebRequest https://repo1.maven.org/maven2/org/xerial/sqlite-jdbc/3.46.1.3/sqlite-jdbc-3.46.1.3.jar -OutFile lib\sqlite-jdbc.jar }
if (-not (Test-Path lib\slf4j-api.jar))   { Invoke-WebRequest https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.13/slf4j-api-2.0.13.jar -OutFile lib\slf4j-api.jar }

# 2. Compile
if (Test-Path out) { Remove-Item -Recurse -Force out }
New-Item -ItemType Directory out | Out-Null
javac -d out (Get-ChildItem src\*.java).FullName test\ApiTest.java
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Tests: in-memory store, then the real SQLite store
Write-Host "`n=== Tests with in-memory data ==="
java -cp out ApiTest
Write-Host "`n=== Tests with SQLite ==="
java -cp "out;lib/*" ApiTest sqlite
