terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "my_bucket" {
  source = "./modules/s3_bucket"

  bucket_name       = "tarun-demo-bucket-2026-001"
  enable_versioning = true
  enable_encryption = true
  public_bucket     = false
}