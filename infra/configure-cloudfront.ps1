# Script to update CloudFront distribution with HTTPS redirect and SPA error responses
$ErrorActionPreference = "Stop"

$distId = "E17EHUE3M9DVKY"
Write-Host "Fetching current CloudFront config for $distId..." -ForegroundColor Cyan
$json = aws cloudfront get-distribution-config --id $distId | ConvertFrom-Json
$etag = $json.ETag
$config = $json.DistributionConfig

# 1. Enforce HTTPS redirect
$config.DefaultCacheBehavior.ViewerProtocolPolicy = "redirect-to-https"

# 2. Add SPA Custom Error Responses (403 & 404 -> /index.html with HTTP 200)
$config.CustomErrorResponses = @{
    Quantity = 2
    Items = @(
        @{
            ErrorCode = 403
            ResponsePagePath = "/index.html"
            ResponseCode = "200"
            ErrorCachingMinTTL = 10
        },
        @{
            ErrorCode = 404
            ResponsePagePath = "/index.html"
            ResponseCode = "200"
            ErrorCachingMinTTL = 10
        }
    )
}

$tempConfigFile = "infra/cf-updated-config.json"
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $tempConfigFile

Write-Host "Applying updated CloudFront config..." -ForegroundColor Cyan
aws cloudfront update-distribution --id $distId --distribution-config file://$tempConfigFile --if-match $etag

Remove-Item -Path $tempConfigFile -ErrorAction SilentlyContinue
Write-Host "CloudFront distribution $distId successfully updated!" -ForegroundColor Green
