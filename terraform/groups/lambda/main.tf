terraform {
  backend "s3" {
  }

  required_version = "~> 1.3"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.72.0"
    }

    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.18.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "secrets" {
  source = "git@github.com:companieshouse/terraform-modules//aws/parameter-store?ref=1.0.363"

  name_prefix = local.service_name
  kms_key_id  = data.aws_kms_key.kms_key.id
  secrets     = nonsensitive(merge(local.service_secrets, local.stack_secrets))
}

module "lambda" {
  source = "git@github.com:companieshouse/terraform-modules.git//aws/lambda?ref=1.0.365"

  environment    = var.environment
  function_name  = local.lambda_function_name
  lambda_runtime = var.lambda_runtime
  lambda_handler = var.lambda_handler_name

  lambda_code_s3_bucket = var.release_bucket_name
  lambda_code_s3_key    = var.release_artifact_key

  lambda_memory_size         = var.lambda_memory_size
  lambda_timeout_seconds     = var.lambda_timeout_seconds
  lambda_logs_retention_days = var.lambda_logs_retention_days

  lambda_env_vars = {
    MONGO_PROTOCOL                 = local.service_secrets["mongo_protocol"]
    MONGO_HOST_AND_PORT            = local.service_secrets["mongo_hostandport"]
    MONGO_USER                     = local.service_secrets["mongo_user"]
    MONGO_DB_NAME                  = local.service_secrets["mongo_dbname"]
    MONGO_COLLECTION_PROJECTS      = local.service_secrets["mongo_collection_projects"]
    MONGO_PASSWORD_PARAMSTORE_NAME = "${local.ssm_prefix}/mongo_password"
    DT_APIKEY_PARAMSTORE_NAME      = "${local.ssm_prefix}/dt_server_apikey"
    ENV                            = "${var.environment}"
  }

  lambda_cloudwatch_event_rules = local.lambda_cloudwatch_event_rules
  additional_policies           = local.additional_iam_policies_json

  lambda_sg_egress_rule = {
    from_port   = -1
    to_port     = -1
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lambda_vpc_access_subnet_ids = local.lambda_vpc_access_subnet_ids
  lambda_vpc_id                = data.aws_vpc.vpc.id
}
