import { Permission } from "@saleor/app-sdk/types";
import { initTRPC } from "@trpc/server";

import { TrpcContextAppRouter } from "@/modules/trpc/context-app-router";

interface Meta {
  requiredClientPermissions?: Permission[];
}

const t = initTRPC.context<TrpcContextAppRouter>().meta<Meta>().create();

export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;
