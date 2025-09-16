import { Db, MongoClient, Collection, PullAllOperator } from "mongodb";

import { getEnvironmentValue, isRunningInLambda } from "../utils/envUtils.js";
import * as config from "../config/index.js";
import {logger, logErr} from "../utils/logger.js";
import {getParamStore} from "../aws/ssm.js"
import {DTVersion, UUIDsRecord} from "../deptrack/deptrack.js";

let mongoClient: MongoClient;
let database: Db;
let collection: Collection;

let defaultOldDate = "1970-01-01T00:00:00Z";
interface EcsEnv {
  version?: string;
  gitReleaseDate?: Date | null;
}

interface EcsDoc {
  ecs?: {
    cidev?: EcsEnv;
    staging?: EcsEnv;
    live?: EcsEnv;
  };
}

async function init() {
   try {
      if (!mongoClient) {

         const mongoPassword = isRunningInLambda() ?
            await getParamStore(config.MONGO_PASSWORD_PARAMSTORE_NAME):
            getEnvironmentValue("MONGO_PASSWORD");
         const mongoUri = `${config.MONGO_PROTOCOL}://${config.MONGO_USER}:${mongoPassword}@${config.MONGO_HOST_AND_PORT}`;
         logger.info(`connecting to Mongo: ${mongoPassword ? mongoUri.replace(mongoPassword, 'xxxxx') : mongoUri}`);
         mongoClient = new MongoClient(mongoUri);
      }
      await mongoClient.connect();
      database = mongoClient.db(config.MONGO_DB_NAME);
      collection = database.collection(config.MONGO_COLLECTION_PROJECTS);
   }
   catch(error) {
      logErr(error, "Error connecting to Mongo:");
   }
}

function close() {
   mongoClient.close();
}

// get "old" versions, which means versions that:
// - are not any of the ones deployed in cidev / staging / live
// - are older than the config.MAX_RECENT_VERSIONS
async function getOldUuids() {
   const uuids: UUIDsRecord = {};
   try {
      const cursor = collection.find();

      while (await cursor.hasNext()) {
         const doc = await cursor.next();
         if (!doc) continue;


         const deployedVersions = new Set<string>([
         doc.ecs?.cidev?.version || "",
         doc.ecs?.staging?.version || "",
         doc.ecs?.live?.version || "",
         ].filter(Boolean)); // removes empty strings

         const sortedVersions = [...doc.versions].sort(
           (a, b) => new Date(b.lastBomImport || defaultOldDate).getTime() - new Date(a.lastBomImport || defaultOldDate).getTime()
         );

         const recentVersions = new Set(sortedVersions.slice(0, config.MAX_RECENT_VERSIONS).map(v => v.version));

         const uuidsToDrop: DTVersion[] = doc.versions
            .filter((v: DTVersion) =>
               !deployedVersions.has(v.version) &&
               !recentVersions.has(v.version)
            )
            .map((v: DTVersion) => ({ version: v.version, uuid: v.uuid }));

         if (uuidsToDrop.length > 0) {
            uuids[doc.name] = uuidsToDrop;
         }
      }
      }  catch (error) {
         logErr(error, 'Error finding uuids:');
   }
   logger.info(`Found these old versions:${JSON.stringify(uuids)}`);
   return uuids;
}

// remove the old versions stored in MongoDB
export async function deleteOldUuids(uuids: UUIDsRecord) {
   try {

   for (const [serviceName, versions] of Object.entries(uuids)) {
      logger.info(`Removing old versions from [${serviceName}]`);
      const uuidsToRemove = versions.map(v => v.uuid);

      const result = await collection.updateOne(
         { name: serviceName },
         {
            $pull: {
               versions: {
                  uuid: { $in: uuidsToRemove },
               } as any,
            },
         }
      );

      logger.info(`Removed ${result.modifiedCount} entries`);
   }
   } catch (error) {
      logErr(error, "Error while deleting old UUIDs:", );
   }
}

export { init, close, getOldUuids };
