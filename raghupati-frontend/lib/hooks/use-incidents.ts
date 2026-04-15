"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchIncident, fetchIncidents } from "@/lib/api/adapters";

export function useIncidentsQuery() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
  });
}

export function useIncidentQuery(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => fetchIncident(id),
    enabled: Boolean(id),
  });
}
