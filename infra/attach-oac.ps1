# Script to attach OAC to CloudFront distribution E17EHUE3M9DVKY
$ErrorActionPreference = "Stop"

$distId = "E17EHUE3M9DVKY"
$oacId = "EDPRKAO9H46R1"
$bucketRegionalDomain = "benkrack.com.s3.us-west-2.amazonaws.com"

Write-Host "Fetching current CloudFront config for $distId..." -ForegroundColor Cyan
$json = aws cloudfront get-distribution-config --id $distId | ConvertFrom-Json
$etag = $json.ETag
$config = $json.DistributionConfig

# Update Origin 0 to S3 REST endpoint with OAC
$origin = $config.Origins.Items[0]
$origin.DomainName = $bucketRegionalDomain
$origin.OriginAccessControlId = $oacId
$origin.Id = "S3-benkrack.com"

# Remove CustomOriginConfig and replace with S3OriginConfig
$origin.PSObject.Properties.Remove("CustomOriginConfig")
$origin | Add-Member -MemberType NoteProperty -Name "S3OriginConfig" -Value ([PSCustomObject]@{ OriginAccessIdentity = "" })

# Update DefaultCacheBehavior target origin ID
$config.DefaultCacheBehavior.TargetOriginId = "S3-benkrack.com"

$tempConfigFile = "infra/cf-oac-config.json"
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $tempConfigFile

Write-Host "Applying OAC to CloudFront distribution..." -ForegroundColor Cyan
aws cloudfront update-distribution --id $distId --distribution-config file://$tempConfigFile --if-match $etag

Remove-Item -Path $tempConfigFile -ErrorAction SilentlyContinue
Write-Host "Successfully attached OAC to CloudFront!" -ForegroundColor Green
