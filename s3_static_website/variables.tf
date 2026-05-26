variable "bucket_name" {
  type = string
}

variable "enable_versioning" {
  type    = bool
  default = true
}

variable "enable_encryption" {
  type    = bool
  default = true
}

variable "public_bucket" {
  type    = bool
  default = false
}