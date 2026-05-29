variable "aws_region" {
  description = "The AWS region to deploy the CloudFront distribution."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "The name of the S3 bucket to be used as the origin for the CloudFront distribution."
  type        = string
}

