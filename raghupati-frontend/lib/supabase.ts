import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

const createMockClient = () => {
  const mock: any = {
    from: () => mock,
    select: () => mock,
    insert: () => mock,
    update: () => mock,
    upsert: () => mock,
    delete: () => mock,
    eq: () => mock,
    order: () => mock,
    limit: () => mock,
    single: () => Promise.resolve({ data: null, error: null }),
    channel: () => mock,
    on: () => mock,
    subscribe: () => mock,
    removeChannel: () => Promise.resolve(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
  return mock;
};

export const supabase = (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : createMockClient() as ReturnType<typeof createClient>;
