import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export const supabase = (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : (null as unknown as ReturnType<typeof createClient>);
