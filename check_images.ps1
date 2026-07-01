Add-Type -AssemblyName System.Drawing
Get-ChildItem -Recurse -Path 'D:\dream_project\ban_hang\public' -Include *.png | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    Write-Output ($_.FullName + ' => ' + $img.Width + 'x' + $img.Height)
    $img.Dispose()
}
