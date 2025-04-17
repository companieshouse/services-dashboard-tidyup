import { Handler, Context } from 'aws-lambda';

import {deleteOldData} from "./coreLogic.js";
import {logger, logErr} from "./utils/logger.js";
import { isRunningInLambda } from "./utils/envUtils.js";

// Handler function for Lambda
export const handler: Handler = async (
        event: any,
        context: Context
      ) => {

    try {
        if (event) {
            logger.info(`hanlder triggered by received event:${JSON.stringify(event, null, 2)}`);
            if (event.action === "delete") {
                    await deleteOldData();
            } else {
                logger.info(`Unhandled action: ${event.action}`);
            }
        }
    } catch (error) {
        logErr(error, "Error removing old data:");
    }

    return {};
};

// normal main when running locally
if (!isRunningInLambda()) {
    deleteOldData();
}
