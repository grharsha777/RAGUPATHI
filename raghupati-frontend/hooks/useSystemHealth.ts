'use client';

import useSWR from 'swr';

export type ProviderHealth = {
  provider: string;
  ok: boolean;
  error?: string;
  latency_ms?: number;
};

export type SystemHealth = {
  status: string;
  service: string;
  environment: string;
  agents: Record<string, ProviderHealth>;
};

const fetcher = async (): Promise<SystemHealth | null> => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

export function useSystemHealth() {
  const { data, error, isLoading, mutate } = useSWR('system-health', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const providers = data?.agents || {};
  const allOk = Object.values(providers).every((p) => p.ok);
  const onlineCount = Object.values(providers).filter((p) => p.ok).length;
  const totalCount = Object.values(providers).length;

  return {
    health: data,
    providers,
    allOk,
    onlineCount,
    totalCount,
    status: data?.status || 'unknown',
    error,
    isLoading,
    refresh: mutate,
  };
}
