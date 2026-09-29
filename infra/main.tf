terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# us-east-1 provider is mandatory for CloudFront ACM certificates
provider "aws" {
  region = "us-east-1"
}

locals {
  domain_name = "benkrack.com"
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Private S3 Bucket for Static Assets
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "site" {
  bucket = "${replace(local.domain_name, ".", "-")}-origin"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. CloudFront Origin Access Control (OAC)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.domain_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Free ACM SSL Certificate for CloudFront
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_acm_certificate" "cert" {
  domain_name               = local.domain_name
  subject_alternative_names = ["www.${local.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Amazon CloudFront Distribution (Origin for Cloudflare)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [local.domain_name, "www.${local.domain_name}"]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Managed CachingOptimized Policy ID
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA Routing rewrite: 403/404 -> /index.html with HTTP 200
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. S3 Bucket Policy (Restricts access exclusively to CloudFront)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket_policy" "site_policy" {
  bucket = aws_s3_bucket.site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────
output "s3_bucket_name" {
  description = "S3 bucket for built dist/ assets"
  value       = aws_s3_bucket.site.id
}

output "cloudfront_domain_name" {
  description = "Target domain to point your Cloudflare CNAME to"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "acm_validation_records" {
  description = "CNAME records to enter in Cloudflare DNS for ACM SSL certificate validation"
  value = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
}
