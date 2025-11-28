import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as usersSchema from "./schema/users";
import * as bondsSchema from "./schema/bonds";
import * as auctionsSchema from "./schema/auctions";
import * as auctionBidsSchema from "./schema/auctionBids";
import * as suretyTrustsSchema from "./schema/suretyTrusts";
import * as suretyCasesSchema from "./schema/suretyCases";
import * as suretyIndemnitorsSchema from "./schema/suretyIndemnitors";
import * as suretyCollateralSchema from "./schema/suretyCollateral";
import * as suretyDocumentsSchema from "./schema/suretyDocuments";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "DATABASE_URL is not set. The Bond Exchange + Surety module will not be able to talk to the database until you configure it."
  );
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, {
  schema: {
    ...usersSchema,
    ...bondsSchema,
    ...auctionsSchema,
    ...auctionBidsSchema,
    ...suretyTrustsSchema,
    ...suretyCasesSchema,
    ...suretyIndemnitorsSchema,
    ...suretyCollateralSchema,
    ...suretyDocumentsSchema,
  },
});

export * from "./schema/users";
export * from "./schema/bonds";
export * from "./schema/auctions";
export * from "./schema/auctionBids";
export * from "./schema/suretyTrusts";
export * from "./schema/suretyCases";
export * from "./schema/suretyIndemnitors";
export * from "./schema/suretyCollateral";
export * from "./schema/suretyDocuments";
