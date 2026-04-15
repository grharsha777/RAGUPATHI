"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchHealth } from "@/lib/api/adapters";

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 20_000,
  });
}
