import { z } from "zod";

import {
  agentStatusSchema,
  auditEventSchema,
  ciResultSchema,
  incidentSchema,
  patchResultSchema,
  prResultSchema,
  reportArtifactSchema,
  repositorySchema,
  retryStateSchema,
  severitySchema,
  timelineEventSchema,
} from "@/lib/types/domain";

export const systemHealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  agents: z.record(
    z.object({
      provider: z.string(),
      ok: z.boolean(),
      error: z.string().optional(),
    }),
  ),
});

export const repositoryListSchema = z.array(repositorySchema);
export const reportListSchema = z.array(reportArtifactSchema);

export const incidentDetailSchema = incidentSchema.extend({
  confidence: z.number().min(0).max(1),
  rootCause: z.string(),
  vulnerablePackages: z.array(z.string()),
  vulnerableFiles: z.array(z.string()),
  patch: patchResultSchema.optional(),
  ci: ciResultSchema.optional(),
  pr: prResultSchema.optional(),
  slackDelivered: z.boolean(),
  emailDelivered: z.boolean(),
  retryHistory: z.array(
    z.object({
      state: retryStateSchema,
      at: z.string(),
      detail: z.string(),
    }),
  ),
  timeline: z.array(timelineEventSchema),
  explainability: z.string(),
});

export { auditEventSchema, incidentSchema, severitySchema, agentStatusSchema };
