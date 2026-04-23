import { createClient } from '@supabase/supabase-js'
import { env } from "@/env"

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a single supabase client for interacting with your database
// We check if the URL exists to prevent crashing during static generation on Vercel
// Create a dummy client that doesn't crash if environment variables are missing
// Create a mock client that doesn't crash if environment variables are missing
const createMockClient = () => {
  const chainablePromise = (data: any) => {
    const p = Promise.resolve({ data, error: null }) as any;
    p.order = () => chainablePromise(data);
    p.eq = () => chainablePromise(data);
    p.limit = () => chainablePromise(data);
    p.single = () => Promise.resolve({ data: data[0] || null, error: null });
    return p;
  };

  const mock: any = {
    from: () => ({
      select: () => chainablePromise([]),
      insert: () => chainablePromise([]),
      update: () => chainablePromise([]),
      upsert: () => chainablePromise([]),
      delete: () => chainablePromise([]),
    }),
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

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as ReturnType<typeof createClient>;
