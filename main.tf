terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Create IAM User
resource "aws_iam_user" "test1" {
  name = "TerraformIAMTest1"
}

# Create Access Key
resource "aws_iam_access_key" "test1" {
  user = aws_iam_user.test1.name
}

# Create IAM Policy Document
data "aws_iam_policy_document" "test1_policy" {
  statement {
    effect = "Allow"

    actions = [
      "iam:ListUsers"
    ]

    resources = ["*"]
  }
}

# Attach Policy to User
resource "aws_iam_user_policy" "test1_policy" {
  name = "TerraformTest"

  user = aws_iam_user.test1.name

  policy = data.aws_iam_policy_document.test1_policy.json
}