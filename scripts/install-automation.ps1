param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$taskName = 'VKD ERP Automation'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workerPath = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'api\worker.php')).Path
$phpPath = 'C:\xampp\php\php.exe'
if (-not (Test-Path -LiteralPath $phpPath)) { throw 'XAMPP PHP was not found.' }
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and ($existing.Actions.Arguments -notcontains ('"' + $workerPath + '"'))) { throw 'A different task already uses this name; no task was changed.' }
if (-not $CheckOnly) {
    $action = New-ScheduledTaskAction -Execute $phpPath -Argument ('"' + $workerPath + '"') -WorkingDirectory $projectRoot
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(15) -RepetitionInterval (New-TimeSpan -Minutes 1)
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Process local VKD ERP renewals, due vendor bills and configured message queues every minute.' -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
}
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State,@{Name='Executable';Expression={$_.Actions.Execute}},@{Name='Arguments';Expression={$_.Actions.Arguments}}
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object LastRunTime,LastTaskResult,NextRunTime
