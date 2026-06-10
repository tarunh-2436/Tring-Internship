variable "table_name" {
  description = "The name of the DynamoDB table."
  type        = string
}

variable "hash_key" {
  description = "The name of the hash key attribute."
  type        = string
}

variable "range_key" {
  description = "The name of the range key attribute (optional)."
  type        = string
  default     = null
}