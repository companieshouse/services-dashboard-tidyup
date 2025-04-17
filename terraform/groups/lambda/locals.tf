locals {

  service_name         = "services-dashboard-tidyup"
  stack_name           = "${var.stack_name}"
  lambda_function_name = "${local.service_name}-${var.environment}"
  stack_secrets_path   = "applications/${var.aws_profile}/${var.environment}/${local.stack_name}"
  service_secrets_path = "${local.stack_secrets_path}/services-dashboard"
  ssm_prefix           = "/${local.service_name}"

  vpc_name                   = local.vault_secrets["vpc_name"]
  application_subnet_ids     = data.aws_subnets.application.ids
  application_subnet_pattern = local.vault_secrets["application_subnet_pattern"]

  # Secrets
  stack_secrets   = jsondecode(data.vault_generic_secret.stack_secrets.data_json)
  service_secrets = jsondecode(data.vault_generic_secret.service_secrets.data_json)

  # Create a single map of secrets merging "stack" & "service" secrets.
  # Note: in case a secret with the same name is present in "stack" and "service"
  # the "service"'s value will overwrite the "stack"'s value.
  # This allows the normal practice of having (global) secrets as defaults
  # which can be overwritten by service specific needs
  vault_secrets = merge(local.stack_secrets, local.service_secrets)

  # The map 'vault_secrets' cannot be used directly in a for_each loop because
  # Terraform does not allow loops with sensitive values.
  # Terraform’s sensitivity propagation continues with nested or derived values.
  # A working solution is to use a "cleared" map with the same keys but with nonsensitive values
  # then loop on the cleared map and access the sensitive values using the key.
  ssm_secret_keys = nonsensitive(tomap({
    for k in keys(local.vault_secrets) :
    k => (can(nonsensitive(k)) ? nonsensitive(k) : k)
  }))

}
