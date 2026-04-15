"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchAudit, fetchReports, fetchRepositories } from "@/lib/api/adapters";

export function useRepositoriesQuery() {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: fetchRepositories,
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
  });
}

export function useAuditQuery() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: fetchAudit,
  });
}
