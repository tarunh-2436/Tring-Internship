# output "iam_username" {
#   value = aws_iam_user.test1.name
# }

# output "access_key_id" {
#   value = aws_iam_access_key.test1.id
# }

# output "secret_access_key" {
#   value     = aws_iam_access_key.test1.secret
#   sensitive = true
# }

output "website_url" {
  value = aws_s3_bucket_website_configuration.static_site.website_endpoint
}