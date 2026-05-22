# IAM User
resource "aws_iam_user" "test1" {
  name = var.iam_user_name
}

# Access Key
resource "aws_iam_access_key" "test1" {
  user = aws_iam_user.test1.name
}

# IAM Policy Document
data "aws_iam_policy_document" "test1_policy" {
  statement {
    effect = "Allow"

    actions = [
      "iam:ListUsers",
      "iam:GetUser"
    ]

    resources = ["*"]
  }
}

# Attach Policy
resource "aws_iam_user_policy" "test1_policy" {
  name   = "TerraformTest"
  user   = aws_iam_user.test1.name
  policy = data.aws_iam_policy_document.test1_policy.json
}