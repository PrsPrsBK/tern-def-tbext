<#
 # @fileoverview run as postpublish.
 # 1. update defs/which_is_used.txt
 # 2. delete cset_pub.log and rename cset.log to cset_pub.log
 # @author PrsPrsBK
#>

Param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({
    if(-Not (Test-Path $_) -Or (Resolve-Path $_).Provider.Name -ne "FileSystem") {
      throw "Please specify valid mozilla-xxx repository path : '$_'"
    }
    return $true
  })]
  [string]$MozillaRepo,
  [Parameter(Mandatory = $true)]
  [ValidateScript({
    if((Resolve-Path $_).Provider.Name -ne "FileSystem") {
      throw "Please specify valid comm repository path : '$_'"
    }
    return $true
  })]
  [string]$CommRepo
)

Begin {
  Get-Command hg -ErrorAction:Ignore | Out-Null
  if($? -eq $false) {
    throw "hg does not exist on the PATH."
  }
}

Process {
  $script_path =  (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $cset_pubed =  (Join-Path -Path $script_path -ChildPath "cset_pubed.log")
  $cset_today =  (Join-Path -Path $script_path -ChildPath "cset.log")
  $which_is_used =  (Join-Path -Path $script_path -ChildPath "defs/which_is_used.txt")

  New-Item $which_is_used -ItemType File -Force | Out-Null
  Start-Job -ArgumentList $MozillaRepo, $which_is_used -ScriptBlock {
    Param($repo, $log)
    hg log -l 1 -R $repo --template "mozilla-central changeset: {rev}:{node}" `
    | Add-Content $log
  } | Wait-Job | Receive-Job | Remove-Job

  Start-Job -ArgumentList $CommRepo, $which_is_used -ScriptBlock {
    Param($repo, $log)
    hg log -l 1 -R $repo --template "comm-central changeset: {rev}:{node}" `
    | Add-Content $log
  } | Wait-Job | Receive-Job | Remove-Job

  Start-Job -ArgumentList $cset_pubed -ScriptBlock {
    Param($old)
    Remove-Item $old
  } | Wait-Job | Receive-Job | Remove-Job

  Rename-Item $cset_today $cset_pubed
}

End {
}

# vim:expandtab ff=dos fenc=utf-8 sw=2
