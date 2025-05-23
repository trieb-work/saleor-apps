import { APL } from "@saleor/app-sdk/APL";
import { FileAPL } from "@saleor/app-sdk/APL/file";
import { RedisAPL } from "@saleor/app-sdk/APL/redis";
import { SaleorCloudAPL } from "@saleor/app-sdk/APL/saleor-cloud";
import { UpstashAPL } from "@saleor/app-sdk/APL/upstash";
import { SaleorApp } from "@saleor/app-sdk/saleor-app";
import { createClient } from "redis";

const aplType = process.env.APL ?? "file";

export let apl: APL;

switch (aplType) {
  case "upstash":
    apl = new UpstashAPL();

    break;

  case "file":
    apl = new FileAPL();

    break;

  case "saleor-cloud": {
    if (!process.env.REST_APL_ENDPOINT || !process.env.REST_APL_TOKEN) {
      throw new Error("Rest APL is not configured - missing env variables. Check saleor-app.ts");
    }

    apl = new SaleorCloudAPL({
      resourceUrl: process.env.REST_APL_ENDPOINT,
      token: process.env.REST_APL_TOKEN,
    });

    break;
  }
  case "redis": {
    if (!process.env.REDIS_URL) {
      throw new Error("Redis APL is not configured - missing env variables. Check saleor-app.ts");
    }

    const client = createClient({
      url: process.env.REDIS_URL,
    });

    // Handle connection errors
    client.on("error", () => {
      process.exit(1);
    });

    apl = new RedisAPL({
      client,
      hashCollectionKey: "app-smtp",
    });

    break;
  }
  default: {
    throw new Error("Invalid APL config, ");
  }
}
export const saleorApp = new SaleorApp({
  apl,
});

export const REQUIRED_SALEOR_VERSION = ">=3.11.7 <4";
