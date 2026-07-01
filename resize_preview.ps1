Add-Type -AssemblyName System.Drawing
$files = @('output.png','background.png','man.png','table.png','apple.png','mango.png','tomato.png')
foreach ($f in $files) {
    $src = "D:\dream_project\ban_hang\public\$f"
    $img = [System.Drawing.Image]::FromFile($src)
    $ratio = 300.0 / [Math]::Max($img.Width, $img.Height)
    $w = [int]($img.Width * $ratio)
    $h = [int]($img.Height * $ratio)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $out = "D:\dream_project\ban_hang\preview_$f"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $img.Dispose()
    Write-Output "Saved $out"
}
