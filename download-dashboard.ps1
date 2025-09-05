# PowerShell script to download dashboard image
$uri = "https://school-dash.jack-lee21.workers.dev/api/dashboard"
$headers = @{
    "X-Battery-Level" = "85"
}
$outputFile = "D:\GitHub\school-dash-backend\dashboard.png"

try {
    Write-Host "正在下载仪表板图片..."
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -TimeoutSec 60 -OutFile $outputFile
    Write-Host "图片已保存到: $outputFile"
    
    # 检查文件大小
    $fileInfo = Get-Item $outputFile
    Write-Host "文件大小: $($fileInfo.Length) 字节"
    
    # 如果文件太小，可能下载失败
    if ($fileInfo.Length -lt 1000) {
        Write-Host "警告: 文件太小，可能下载失败"
    }
} catch {
    Write-Host "下载失败: $($_.Exception.Message)"
    Write-Host "错误详情: $($_.Exception.Response.StatusDescription)"
}