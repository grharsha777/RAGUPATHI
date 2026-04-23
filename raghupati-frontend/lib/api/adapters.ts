import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { supabase } from "@/lib/supabase/client";
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

const incidentListSchema = z.array(incidentSchema);

export async function fetchHealth(): Promise<SystemHealth> {
  return apiFetch("/health", systemHealthSchema);
}

export async function fetchAgentsStatus(): Promise<Record<string, unknown>> {
  return apiFetch("/agents/status", z.record(z.unknown()));
}

export async function fetchIncidents(): Promise<Incident[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  return data.map((item: any) => ({
    id: item.id,
    repoFullName: item.source || "Unknown",
    title: item.title,
    description: item.description,
    severity: item.severity.toUpperCase(),
    status: item.status.toUpperCase() === 'OPEN' ? 'IDLE' : 'COMPLETED',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  })) as Incident[];
}

export async function fetchIncident(id: string): Promise<IncidentDetail> {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single();
  
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    repoFullName: data.source,
    title: data.title,
    description: data.description || "",
    severity: data.severity.toUpperCase() as any,
    status: data.status.toUpperCase() === 'OPEN' ? 'IDLE' : 'COMPLETED' as any,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    confidence: 0.9,
    rootCause: "Unknown",
    vulnerablePackages: [],
    vulnerableFiles: [],
    slackDelivered: false,
    emailDelivered: false,
    retryHistory: [],
    timeline: [],
    explainability: "",
  } as unknown as IncidentDetail;
}

export async function fetchRepositories(): Promise<Repository[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('github_pat') : null;
  if (!token) return [];

  try {
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) throw new Error("Failed to fetch from GitHub");
    const data = await res.json();

    return data.map((repo: any) => ({
      id: repo.id.toString(),
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      webhookStatus: "unknown" as const,
      riskScore: 0,
      openIssues: repo.open_issues_count,
      dependencyHealth: "unknown" as const,
      ciHealth: "unknown" as const,
      branchProtection: false,
      lastScanAt: repo.updated_at,
    })) as Repository[];
  } catch (err) {
    console.error("fetchRepositories error:", err);
    return [];
  }
}

export async function fetchReports(): Promise<ReportArtifact[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('reports').select('*');
  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    id: item.id,
    incidentId: item.id, // Placeholder mapping
    kind: item.type,
    title: item.title,
    createdAt: item.created_at,
    href: item.url,
  })) as ReportArtifact[];
}

export async function fetchAudit(): Promise<AuditEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    id: item.id,
    traceId: item.id,
    incidentId: null,
    timestamp: item.created_at,
    actor: item.actor,
    action: item.action,
    resource: item.resource,
    metadata: item.metadata,
  })) as AuditEvent[];
}
