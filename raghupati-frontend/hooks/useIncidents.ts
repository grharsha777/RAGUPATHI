import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

export function useIncidents() {
  const fetcher = async () => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[useIncidents] fetch failed:', err);
      return [];
    }
  };

  const { data, error, isLoading, mutate } = useSWR(
    'incidents-dashboard',
    fetcher,
    { refreshInterval: 5000 }
  );

  return { incidents: data || [], error, isLoading, mutate };
}
