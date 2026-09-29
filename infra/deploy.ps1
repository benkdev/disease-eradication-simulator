# Deployment script for benkrack.com to AWS S3 & CloudFront
param(
  [string]$BucketName = "benkrack.com",
  [string]$DistributionId = "E17EHUE3M9DVKY"
)

$ErrorActionPreference = "Stop"

Write-Host "1. Building web application..." -ForegroundColor Cyan
pnpm --filter @tld/web build

Write-Host "2. Syncing hashed static assets (1-year immutable cache)..." -ForegroundColor Cyan
aws s3 sync apps/web/dist/assets "s3://$BucketName/assets" --cache-control "public, max-age=31536000, immutable" --delete

Write-Host "3. Syncing index.html and root files (must-revalidate)..." -ForegroundColor Cyan
aws s3 sync apps/web/dist "s3://$BucketName" --exclude "assets/*" --cache-control "public, max-age=0, must-revalidate" --delete

if ($DistributionId) {
  Write-Host "4. Invalidating CloudFront cache for distribution $DistributionId..." -ForegroundColor Cyan
  aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
}

Write-Host "Deployment complete! Site live at https://benkrack.com" -ForegroundColor Green
