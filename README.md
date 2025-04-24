# services-dashboard-tidyup

This service is the Tidy-up component of the services dashboard.
_(Refer to the main documentation in [services-dashboard-api](https://github.com/companieshouse/services-dashboard-api/) for an overview.)_

It's a lambda function primarily designed to remove _old_ data of the services from both Dependency Track and Mongo.

The assumption, regarding _old_, is that the data of a version of a service can be removed if:

- it's not one of those deployed in cidev / staging / live
- it's not one of the most recent N (where N is a configurable integer (var `MAX_RECENT_VERSIONS`))

## AWS trigger/ manual test

Thw execution is triggered by [this json](https://github.com/companieshouse/services-dashboard-tidyup/blob/2e1a72c3467ba181f494f297b182649d629d0e79/terraform/groups/lambda/lambda.tf#L105-L107):
```javascript
{
    "action": "delete"
}
```
