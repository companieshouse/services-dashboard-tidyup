import {logger, logErr} from "./utils/logger.js";
import * as mongo from "./mongo/mongo.js";
import {UUIDsRecord, deleteProjects}  from "./deptrack/deptrack.js";

export async function deleteOldData() {
   try {
        await mongo.init();

        logger.info("Getting old uuids from Mongo...");
        let uuids: UUIDsRecord = await mongo.getOldUuids();

        logger.info("Deleting old uuids from Dep. Track...");
        await deleteProjects(uuids);

        logger.info("Deleting old uuids from Mongo...");
        await mongo.deleteOldUuids(uuids);

    } catch (error) {
        logErr(error, "Error fetching uuids:");
    } finally {
        mongo.close();
    }
}
