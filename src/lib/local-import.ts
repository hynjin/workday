import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma";
import { requireUserId } from "./auth";
import { dateKeyToDate } from "./workday-date";

const identity = z.string().uuid();
const timestamp = z.string().datetime();
const taskSchema = z.object({
  localId: identity, deviceId: identity, title: z.string().trim().min(1).max(120),
  createdAt: timestamp, updatedAt: timestamp, importedAt: timestamp.optional(),
});
const itemSchema = z.object({
  localId: identity, deviceId: identity, taskLocalId: identity, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(120), status: z.enum(["planned", "completed"]),
  dailyGoalMinutes: z.number().int().min(1).max(1440).nullable(), completedAt: timestamp.nullable(),
  dismissedAt: timestamp.nullable().optional(),
  createdAt: timestamp, updatedAt: timestamp, importedAt: timestamp.optional(),
});
const sessionSchema = z.object({
  localId: identity, deviceId: identity, itemLocalId: identity, startedAt: timestamp,
  endedAt: timestamp.nullable(), durationSeconds: z.number().int().min(0).max(86_400).nullable(),
  createdAt: timestamp, updatedAt: timestamp, importedAt: timestamp.optional(),
});
const bundleSchema = z.object({
  version: z.literal(1), deviceId: identity,
  tasks: z.array(taskSchema).max(5000), items: z.array(itemSchema).max(10000), sessions: z.array(sessionSchema).max(20000),
}).superRefine((bundle, context) => {
  for (const [kind, records] of [["task", bundle.tasks], ["item", bundle.items], ["session", bundle.sessions]] as const) {
    if (records.some(record => record.deviceId !== bundle.deviceId)) context.addIssue({ code: "custom", message: `${kind} deviceId mismatch` });
  }
});

export type LocalImportResult = {
  batchId: string; importedAt: string;
  created: { tasks: number; items: number; sessions: number };
  skipped: { tasks: number; items: number; sessions: number };
};

export async function importLocalBundle(input: unknown): Promise<LocalImportResult> {
  const userId = await requireUserId();
  const bundle = bundleSchema.parse(input);
  const batch = await prisma.localImportBatch.create({ data: { userId, deviceId: bundle.deviceId } });
  const created = { tasks: 0, items: 0, sessions: 0 };
  const skipped = { tasks: 0, items: 0, sessions: 0 };
  try {
    await prisma.$transaction(async (tx) => {
      const taskCloudIds = new Map<string, string>();
      for (const local of bundle.tasks) {
        const prior = await tx.importedLocalRecord.findUnique({
          where: { userId_deviceId_entityType_localId: { userId, deviceId: bundle.deviceId, entityType: "task", localId: local.localId } },
        });
        if (prior) { taskCloudIds.set(local.localId, prior.cloudId); skipped.tasks += 1; continue; }
        const task = await tx.task.create({
          data: { userId, title: local.title, createdAt: new Date(local.createdAt), updatedAt: new Date(local.updatedAt) },
        });
        taskCloudIds.set(local.localId, task.id);
        await tx.importedLocalRecord.create({
          data: { userId, deviceId: bundle.deviceId, localId: local.localId, entityType: "task", cloudId: task.id, batchId: batch.id },
        });
        created.tasks += 1;
      }

      const itemCloudIds = new Map<string, string>();
      for (const local of bundle.items) {
        const prior = await tx.importedLocalRecord.findUnique({
          where: { userId_deviceId_entityType_localId: { userId, deviceId: bundle.deviceId, entityType: "workdayItem", localId: local.localId } },
        });
        if (prior) { itemCloudIds.set(local.localId, prior.cloudId); skipped.items += 1; continue; }
        const taskId = taskCloudIds.get(local.taskLocalId);
        if (!taskId) throw new Error(`Missing local task relation: ${local.taskLocalId}`);
        const workdayDate = dateKeyToDate(local.date);
        const workday = await tx.workday.upsert({
          where: { userId_workdayDate: { userId, workdayDate } },
          create: { userId, workdayDate }, update: {},
        });
        const existing = await tx.workdayItem.findUnique({ where: { workdayId_taskId: { workdayId: workday.id, taskId } } });
        const item = existing ?? await tx.workdayItem.create({
          data: {
            userId, workdayId: workday.id, taskId, titleSnapshot: local.title, legacyTitle: local.title,
            status: local.status, dailyGoalMinutes: local.dailyGoalMinutes, completedAt: local.completedAt ? new Date(local.completedAt) : null,
            dismissedAt: local.dismissedAt ? new Date(local.dismissedAt) : null, createdAt: new Date(local.createdAt),
          },
        });
        itemCloudIds.set(local.localId, item.id);
        await tx.importedLocalRecord.create({
          data: { userId, deviceId: bundle.deviceId, localId: local.localId, entityType: "workdayItem", cloudId: item.id, batchId: batch.id },
        });
        created.items += 1;
      }

      for (const local of bundle.sessions) {
        const prior = await tx.importedLocalRecord.findUnique({
          where: { userId_deviceId_entityType_localId: { userId, deviceId: bundle.deviceId, entityType: "focusSession", localId: local.localId } },
        });
        if (prior) { skipped.sessions += 1; continue; }
        const workdayItemId = itemCloudIds.get(local.itemLocalId);
        if (!workdayItemId) throw new Error(`Missing local workday item relation: ${local.itemLocalId}`);
        const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: workdayItemId } });
        const session = await tx.focusSession.create({
          data: {
            userId, workdayItemId, startedAt: new Date(local.startedAt), endedAt: local.endedAt ? new Date(local.endedAt) : null,
            durationSeconds: local.durationSeconds, taskTitleSnapshot: item.titleSnapshot, createdAt: new Date(local.createdAt),
          },
        });
        await tx.importedLocalRecord.create({
          data: { userId, deviceId: bundle.deviceId, localId: local.localId, entityType: "focusSession", cloudId: session.id, batchId: batch.id },
        });
        created.sessions += 1;
      }
      await tx.localImportBatch.update({
        where: { id: batch.id },
        data: { status: "completed", counts: { created, skipped }, completedAt: new Date() },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) {
    await prisma.localImportBatch.update({
      where: { id: batch.id },
      data: { status: "failed", counts: { created: { tasks: 0, items: 0, sessions: 0 }, skipped }, error: error instanceof Error ? error.message.slice(0, 500) : "Import failed", completedAt: new Date() },
    });
    throw error;
  }
  return { batchId: batch.id, importedAt: new Date().toISOString(), created, skipped };
}
