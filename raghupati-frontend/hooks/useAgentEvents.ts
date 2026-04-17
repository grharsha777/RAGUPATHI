import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';

export function useAgentEvents() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Initial fetch
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('agent_events')
        .select('*, incidents!inner(user_id)')
        .eq('incidents.user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setEvents(data);
    };

    fetchEvents();

    // Realtime subscription
    const channel = supabase
      .channel('agent_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
        },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return { events };
}
