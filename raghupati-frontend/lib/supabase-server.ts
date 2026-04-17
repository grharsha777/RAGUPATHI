import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export const supabaseAdmin = (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : (null as unknown as ReturnType<typeof createClient>);
