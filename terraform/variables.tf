variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "storage_bucket_name" {
  description = "The name of the S3 bucket to store feedback data"
  type        = string
  default     = "tarun-feedback-data-bucket-001"
}

variable "website_bucket_name" {
  description = "The name of the S3 bucket to host the static website"
  type        = string
  default     = "tarun-feedback-website-bucket-001"
}