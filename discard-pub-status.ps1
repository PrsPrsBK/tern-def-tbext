Push-Location $PSScriptRoot

$cset_pubed = (Join-Path -Path $PSScriptRoot -ChildPath "cset_pubed.log")
$cset_today = (Join-Path -Path $PSScriptRoot -ChildPath "cset.log")

Start-Job -ArgumentList $cset_pubed -ScriptBlock {
  Param($old)
  Remove-Item $old
} | Wait-Job | Receive-Job | Remove-Job

Copy-Item $cset_today $cset_pubed

Pop-Location

