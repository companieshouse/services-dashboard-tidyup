import { Db, MongoClient, PushOperator } from "mongodb";

import { getEnvironmentValue, isRunningInLambda } from "../utils/envUtils.js";
import * as config from "../config/index.js";
import {logger, logErr} from "../utils/logger.js";
import {getParamStore} from "../aws/ssm.js"

let mongoClient: MongoClient;

let database: Db;
let defaultOldDate = "1970-01-01T00:00:00Z";

interface DTVersion {
   version: string;
   uuid: string
}
interface EcsVersion {
   version: string;
}

type UUIDsRecord = Record<string, DTVersion[]>;


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
   }
   catch(error) {
      logErr(error, "Error connecting to Mongo:");
   }
}

function close() {
   mongoClient.close();
}

async function tidyUp() {
   const uuids: UUIDsRecord = {};
   try {

      const collection = database.collection(config.MONGO_COLLECTION_PROJECTS);
      const cursor = collection.find();

      while (await cursor.hasNext()) {
         const doc = await cursor.next();
         if (!doc) continue;

          const deployedVersions = new Set<string>([
            ...(doc.ecs?.cidev || []).map((e: EcsVersion) => e.version),
            ...(doc.ecs?.staging || []).map((e: EcsVersion) => e.version),
            ...(doc.ecs?.live || []).map((e: EcsVersion) => e.version),
          ]);

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
   console.log(uuids);
   return uuids;
 }


export { init, close, tidyUp };