import * as config from "./config/index.js";
import {logger, logErr} from "./utils/logger.js";
import * as mongo from "./mongo/mongo.js";

export async function removeOldData() {
   try {
        logger.info("fetching Old uuids ...");
        await mongo.init();
        await mongo.tidyUp();
    } catch (error) {
        logErr(error, "Error fetching uuids:");
    } finally {
        mongo.close();
    }
}
