import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type AgentEvent = {
  id: string;
  agent_name: string;
  status: string;
  output: any;
  duration_ms: number | null;
  created_at: string;
  scan_run_id: string;
};

export function useAgentEvents() {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    if (!supabase) return;

    // Initial fetch — latest 30 agent_runs
    const fetchEvents = async () => {
      try {
        const { data } = await supabase
          .from('agent_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (data) setEvents(data);
      } catch (err) {
        console.warn('[useAgentEvents] fetch failed:', err);
      }
    };

    fetchEvents();

    // Realtime subscription on agent_runs (INSERT + UPDATE)
    const channel = supabase
      ?.channel('agent_runs_realtime')
      ?.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents((prev) => [payload.new as AgentEvent, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setEvents((prev) =>
              prev.map((e) =>
                e.id === (payload.new as AgentEvent).id ? (payload.new as AgentEvent) : e
              )
            );
          }
        }
      )
      ?.subscribe();

    return () => {
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, []);

  return { events };
}
