import * as https from "https";

import { getEnvironmentValue, isRunningInLambda } from "../utils/envUtils.js";
import * as config from "../config/index.js";
import {logger, logErr} from "../utils/logger.js";
import {getParamStore} from "../aws/ssm.js"

export interface DTVersion {
    version: string;
    uuid: string
 }

 export type UUIDsRecord = Record<string, DTVersion[]>;


let apiKey: string = "";

let HttpReqOptionsBase: https.RequestOptions = {
    hostname: config.DT_SERVER_BASEURL,
    port: 443,
    method: "DELETE",
    headers: {},
    timeout: config.DT_TIMEOUT_MS,
  };

async function getApiKey() {
    try {
        if (!apiKey) {
            logger.info("Setting API key for Dependency Track");
            apiKey = isRunningInLambda() ?
                await getParamStore(config.DT_APIKEY_PARAMSTORE_NAME):
                getEnvironmentValue("DT_APIKEY");
        }
    }
    catch(error) {
        logErr(error, "Error setting Dependency Track API key:");
    }
}

// loop through the uuids and delete each one
export async function deleteProjects (
    uuids: UUIDsRecord): Promise<void> {

    await getApiKey();

    HttpReqOptionsBase.headers![config.DT_HTTP_HEADER] = apiKey;

    for (const [key, versions] of Object.entries(uuids)) {
        for (const version of versions) {
            logger.info(`Sending DELETE for service: ${key} Version: ${version.version}, UUID: ${version.uuid}`);
            try {
                await deleteProject(version.uuid);
            }
            catch (error) {
                logErr(error, `Error deleting ${version.uuid}`);
            }
        }
    }
}

// delete a project by uuid
async function deleteProject(uuid: string): Promise<void> {
    const options = {
        ...HttpReqOptionsBase,
        path: `${config.DT_ENDPOINT_PROJECTS}/${uuid}`
    };

    return new Promise((resolve, reject) => {

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    logger.info("Successfully deleted");
                    resolve();
                } else {
                    reject(new Error(`Deletion for [${uuid}] failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy(new Error('Request timeout'));
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.end();
    });
}
