import { getEnvironmentValue } from "../utils/envUtils.js";

export const APPLICATION_NAME= "services-dashboard-tidyup";

export const MAX_RECENT_VERSIONS = parseInt(getEnvironmentValue("MAX_RECENT_VERSIONS", "3"));

// MongoDB configuration
export const MONGO_PROTOCOL = getEnvironmentValue("MONGO_PROTOCOL", "mongodb");
export const MONGO_USER     = getEnvironmentValue("MONGO_USER");
export const MONGO_PASSWORD_PARAMSTORE_NAME = getEnvironmentValue("MONGO_PASSWORD_PARAMSTORE_NAME");
export const MONGO_HOST_AND_PORT = getEnvironmentValue("MONGO_HOST_AND_PORT");
export const MONGO_DB_NAME = getEnvironmentValue("MONGO_DB_NAME");
export const MONGO_COLLECTION_PROJECTS = getEnvironmentValue("MONGO_COLLECTION_PROJECTS","projects");


// DepTrack configuration
export const DT_SERVER_BASEURL = getEnvironmentValue("DT_SERVER_BASEURL", "dependency-track.companieshouse.gov.uk");
export const DT_HTTP_HEADER = "X-API-Key";
export const DT_ENDPOINT_PROJECTS = "/api/v1/project";
export const DT_APIKEY_PARAMSTORE_NAME = getEnvironmentValue("DT_APIKEY_PARAMSTORE_NAME");
export const DT_TIMEOUT_MS = 5000;


// AWS configuration
export const AWS_PROFILE = getEnvironmentValue("AWS_PROFILE","dev");
export const REGION      = getEnvironmentValue("AWS_REGION","eu-west-2");
export const ENVIRONMENT = getEnvironmentValue("ENV","cidev");

