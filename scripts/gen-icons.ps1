# Generates the two PWA icons (192x192 and 512x512) used by manifest.json.
# Run from the project root:  pwsh -File .\scripts\gen-icons.ps1
#
# Style: dark slate background (#0F172A) with a sky-blue "P" centered.
# Replace with your own art whenever you want — these are placeholders.

Add-Type -AssemblyName System.Drawing

function New-Icon {
    param(
        [int]$Size,
        [string]$OutPath
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bg = [System.Drawing.Color]::FromArgb(15, 23, 42)        # slate-900
    $fg = [System.Drawing.Color]::FromArgb(56, 189, 248)      # sky-400
    $g.Clear($bg)

    $fontSize = [int]($Size * 0.55)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush($fg)

    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString("P", $font, $brush, $rect, $fmt)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "wrote $OutPath ($Size x $Size)"
}

$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root "public"

New-Icon -Size 192 -OutPath (Join-Path $publicDir "icon-192.png")
New-Icon -Size 512 -OutPath (Join-Path $publicDir "icon-512.png")
