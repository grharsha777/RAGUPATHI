import { z } from "zod";

export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof severitySchema>;

export const agentStatusSchema = z.enum([
  "IDLE",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "ESCALATED",
]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const retryStateSchema = z.enum([
  "INIT",
  "PATCH_GENERATED",
  "QA_RUNNING",
  "QA_FAILED",
  "RETRY_PATCH",
  "MAX_RETRIES",
  "QA_PASSED",
]);
export type RetryState = z.infer<typeof retryStateSchema>;

export const incidentSchema = z.object({
  id: z.string().uuid(),
  repoFullName: z.string(),
  title: z.string(),
  description: z.string(),
  severity: severitySchema,
  status: agentStatusSchema,
  payload: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Incident = z.infer<typeof incidentSchema>;

export const timelineEventSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  timestamp: z.string(),
  actor: z.enum(["system", "agent", "human"]),
  agentId: z.string().optional(),
  message: z.string(),
  level: z.enum(["info", "warn", "error", "success"]),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const patchResultSchema = z.object({
  filePath: z.string(),
  rationale: z.string(),
  originalContent: z.string(),
  patchedContent: z.string(),
  testsAdded: z.string().optional(),
  language: z.string().optional(),
});
export type PatchResult = z.infer<typeof patchResultSchema>;

export const ciResultSchema = z.object({
  workflowRunId: z.number().nullable(),
  conclusion: z.string().nullable(),
  htmlUrl: z.string().nullable(),
  failedJobs: z.array(z.string()),
  logsExcerpt: z.string(),
});
export type CIResult = z.infer<typeof ciResultSchema>;

export const prResultSchema = z.object({
  number: z.number(),
  htmlUrl: z.string(),
  title: z.string(),
  headSha: z.string().nullable(),
});
export type PRResult = z.infer<typeof prResultSchema>;

export const vanarAgentSchema = z.object({
  id: z.enum([
    "rama",
    "hanuman",
    "angada",
    "jambavan",
    "nala",
    "sugreeva",
    "vibhishana",
  ]),
  displayName: z.string(),
  role: z.string(),
  description: z.string(),
  model: z.string(),
  provider: z.enum(["mistral", "groq"]),
  color: z.string(),
  icon: z.string(),
  status: z.enum(["pending", "running", "complete", "failed", "skipped", "idle"]),
  health: z.enum(["healthy", "degraded", "offline"]),
  lastAction: z.string().optional(),
  output: z.any().optional().nullable(),
  durationMs: z.number().optional().nullable(),
  error: z.string().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  tokensUsed: z.number().optional().nullable(),
});
export type VanarAgent = z.infer<typeof vanarAgentSchema>;

export const repositorySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
  webhookStatus: z.enum(["active", "misconfigured", "unknown"]),
  riskScore: z.number().min(0).max(100),
  openIssues: z.number(),
  dependencyHealth: z.enum(["excellent", "good", "fair", "poor"]),
  ciHealth: z.enum(["passing", "failing", "unknown"]),
  branchProtection: z.boolean(),
  lastScanAt: z.string(),
});
export type Repository = z.infer<typeof repositorySchema>;

export const auditEventSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  incidentId: z.string().nullable(),
  timestamp: z.string(),
  actor: z.string(),
  action: z.string(),
  resource: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  severity: severitySchema,
  read: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

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
export type SystemHealth = z.infer<typeof systemHealthSchema>;

export const reportArtifactSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  kind: z.enum(["html", "pdf", "slack", "email", "pr_summary"]),
  title: z.string(),
  createdAt: z.string(),
  href: z.string().optional(),
});
export type ReportArtifact = z.infer<typeof reportArtifactSchema>;

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
export type IncidentDetail = z.infer<typeof incidentDetailSchema>;
