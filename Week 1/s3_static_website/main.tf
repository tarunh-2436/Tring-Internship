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

  bucket_name       = var.bucket_name
  enable_versioning = var.enable_versioning
  enable_encryption = var.enable_encryption
  public_bucket     = var.public_bucket
}