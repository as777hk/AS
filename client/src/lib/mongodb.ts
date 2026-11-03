import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
// A local fallback keeps static builds possible; runtime auth/database operations still require a real URI.
const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient };
export const mongoClient = globalForMongo.mongoClient ?? new MongoClient(uri || "mongodb://127.0.0.1:27017/studiospace");
if (process.env.NODE_ENV !== "production") globalForMongo.mongoClient = mongoClient;
export const db = mongoClient.db(process.env.MONGODB_DB || "studiospace");
