import { PrismaClient } from "@prisma/client";
import { requireUserId } from "./auth";

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };
const prismaBase = globalForPrisma.prismaBase ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = prismaBase;

type MutableArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

const readOperations = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);
const writeWhereOperations = new Set(["update", "updateMany", "delete", "deleteMany"]);

export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const userId = await requireUserId();
        const scoped = args as MutableArgs;

        if (readOperations.has(operation) || writeWhereOperations.has(operation)) {
          scoped.where = { ...(scoped.where ?? {}), userId };
        }
        if (operation === "create") {
          scoped.data = { ...(scoped.data as Record<string, unknown>), userId };
        }
        if (operation === "createMany") {
          const rows = Array.isArray(scoped.data) ? scoped.data : [scoped.data as Record<string, unknown>];
          scoped.data = rows.map(row => ({ ...row, userId }));
        }
        if (operation === "upsert") {
          scoped.where = { ...(scoped.where ?? {}), userId };
          scoped.create = { ...(scoped.create ?? {}), userId };
          scoped.update = { ...(scoped.update ?? {}), userId };
          if (model === "ProductivityGoal" && scoped.where.id === "default") {
            scoped.where.id = userId;
            scoped.create.id = userId;
          }
        }
        return query(args);
      },
    },
  },
});
