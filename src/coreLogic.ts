import {logger, logErr} from "./utils/logger.js";
import * as mongo from "./mongo/mongo.js";
import {UUIDsRecord, deleteProjects}  from "./deptrack/deptrack.js";

export async function deleteOldData() {
   try {
        await mongo.init();

        logger.info("Getting old uuids from Mongo...");
        let uuids: UUIDsRecord = await mongo.getOldUuids();

        if (Object.keys(uuids).length === 0) {
            logger.info("No old uuids found.");
        } else {
            // ok, so we have a list of uuids to delete from both Dep.Track and then Mongo.
            // Each Dep.Track deletions via REST api takes several seconds. We set a timeout DT_TIMEOUT_MS (ex. 12 seconds)
            // but still some timeouts occur. We proceed to remove from Mongo regardless.
            // Despite the timeouts acutally Dep.Track does delete the uuids, just we don't want to wait too long for it
            // otherwise it will be the lambda itself to timeout (15 min max) when we have to delete many uuids.
            // The worst case is that, IN THEORY, some uuids might not be deleted from Dep.Track
            // while still being deleted from Mongo.
            // The deletion from Mongo means that the dashboard doesn't show them, which gives the clean dashboard that we want
            // Dep.Track anyhow still kept them. To remove those from Dep.Track, will then be a manual sporadic maintenace task
            // in case for a service 'xxxx' we find more than MAX_RECENT_VERSIONS in Dep.Track.

            logger.info("Deleting old uuids from Dep. Track...");
            await deleteProjects(uuids);

            logger.info("Deleting old uuids from Mongo...");
            await mongo.deleteOldUuids(uuids);
        }
    } catch (error) {
        logErr(error, "Error fetching uuids:");
    } finally {
        mongo.close();
    }
}
