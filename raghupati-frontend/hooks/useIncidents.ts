import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';

export function useIncidents() {
  const { data: session } = useSession();

  const fetcher = async () => {
    if (!session?.user?.id) return [];
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    session?.user?.id ? ['incidents', session.user.id] : null,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5s as fallback to realtime
  );

  return { incidents: data || [], error, isLoading, mutate };
}
