# Serves this site locally so you can preview it in a browser before pushing.
# Run from anywhere: powershell -ExecutionPolicy Bypass -File scripts\serve-local.ps1
# Then open http://localhost:8090 in your browser. Ctrl+C to stop.

$root = Split-Path -Parent $PSScriptRoot
$port = 8090
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root"
Write-Host "Open http://localhost:$port/ in your browser (Ctrl+C to stop)"

$mime = @{
    ".html" = "text/html"; ".js" = "application/javascript"; ".css" = "text/css";
    ".json" = "application/json"; ".png" = "image/png"; ".jpg" = "image/jpeg";
    ".jpeg" = "image/jpeg"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon";
    ".yml" = "text/yaml"; ".yaml" = "text/yaml"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
        $path = $req.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $root ($path.TrimStart("/"))
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = $mime[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        $res.StatusCode = 500
    } finally {
        $res.OutputStream.Close()
    }
}
