# Windows (PowerShell): starts the API with the SQLite file inventory.db (run run-tests.ps1 first).
Set-Location $PSScriptRoot
java -cp "out;lib/*" ApiServer
