output "api_url" {
  value = aws_apigatewayv2_api.feedback_api.api_endpoint
}

output "website_url" {
  value = aws_s3_bucket_website_configuration.website.website_endpoint
}

output "storage_bucket_name" {
  value = aws_s3_bucket.storage.bucket
}
output "website_bucket_name" {
  value = aws_s3_bucket.website.bucket
}