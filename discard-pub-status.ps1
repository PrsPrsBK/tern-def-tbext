$script_path =  (Split-Path -Parent $MyInvocation.MyCommand.Path)
$cset_pubed = (Join-Path -Path $script_path -ChildPath "cset_pubed.log")
$cset_today = (Join-Path -Path $script_path -ChildPath "cset.log")

cd $script_path

Start-Job -ArgumentList $cset_pubed -ScriptBlock {
  Param($old)
  Remove-Item $old
} | Wait-Job | Receive-Job | Remove-Job

Copy-Item $cset_today $cset_pubed
