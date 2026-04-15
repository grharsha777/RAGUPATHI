import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import {
  auditEventSchema,
  type AuditEvent,
  type Incident,
  type IncidentDetail,
  type ReportArtifact,
  type Repository,
  type SystemHealth,
} from "@/lib/types/domain";
import {
  incidentDetailSchema,
  incidentSchema,
  reportListSchema,
  repositoryListSchema,
  systemHealthSchema,
} from "@/lib/types/schemas";

const isMockModeEnabled = (): boolean => process.env.NEXT_PUBLIC_USE_MOCKS === "1";

const incidentListSchema = z.array(incidentSchema);

export async function fetchHealth(): Promise<SystemHealth> {
  return apiFetch("/health", systemHealthSchema);
}

export async function fetchAgentsStatus(): Promise<Record<string, unknown>> {
  return apiFetch("/agents/status", z.record(z.unknown()));
}

export async function fetchIncidents(): Promise<Incident[]> {
  return apiFetch("/incidents", incidentListSchema);
}

export async function fetchIncident(id: string): Promise<IncidentDetail> {
  return apiFetch(`/incidents/${id}`, incidentDetailSchema);
}

export async function fetchRepositories(): Promise<Repository[]> {
  return apiFetch("/repositories", repositoryListSchema);
}

export async function fetchReports(): Promise<ReportArtifact[]> {
  return apiFetch("/reports", reportListSchema);
}

export async function fetchAudit(): Promise<AuditEvent[]> {
  return apiFetch("/audit", z.array(auditEventSchema));
}
