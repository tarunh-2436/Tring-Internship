resource aws_dynamodb_table "this" {

  name = var.table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key = var.hash_key
  range_key = var.range_key

  attribute {
    name = var.hash_key
    type = "S"
  }

  attribute {
    name = var.range_key
    type = "S"
  }

  attribute {
    name = "last_updated"
    type = "S"
  }

  attribute {
    name = "entity_type"
    type = "S"
  }

  local_secondary_index {
    name               = "last_updated_index"
    range_key          = "last_updated"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "admin_last_updated_index"
    hash_key           = "entity_type"
    range_key          = "last_updated"
    projection_type    = "ALL"
  }
}