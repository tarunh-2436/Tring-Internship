output "api_endpoint" {
  value = "${aws_apigatewayv2_api.feedback_api.api_endpoint}/prod/feedback"
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "storage_bucket_name" {
  value = aws_s3_bucket.storage.bucket
}
output "website_bucket_name" {
  value = aws_s3_bucket.website.bucket
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.feedback_users.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web_client.id
}

output "cognito_domain" {
  value = aws_cognito_user_pool_domain.feedback_domain.domain
} 