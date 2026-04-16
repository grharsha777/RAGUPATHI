-- ==========================================
-- RAGHUPATI Supabase Initialization Script
-- ==========================================

-- 1. Enable Realtime capabilities for the specified tables
BEGIN;

-- Create Repositories Table
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    webhook_status TEXT DEFAULT 'inactive', -- active, degraded, inactive
    risk_score INTEGER DEFAULT 0,
    dependency_health TEXT DEFAULT 'healthy',
    ci_health TEXT DEFAULT 'unknown',
    open_issues INTEGER DEFAULT 0,
    branch_protection BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Incidents Table (Already used by python backend, but ensuring schema)
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, triaged, investigating, resolved, closed
    severity TEXT DEFAULT 'low', -- low, medium, high, critical
    source TEXT NOT NULL,
    description TEXT,
    repository_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- patch, audit, summary
    status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create User Secrets Table (For GitHub PATs etc.)
CREATE TABLE IF NOT EXISTS public.user_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Ties to auth.users id
    secret_key TEXT NOT NULL, -- e.g. 'github_token'
    secret_value TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, secret_key)
);

-- 2. Turn on Realtime for Incidents and Repositories
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.repositories;
alter publication supabase_realtime add table public.reports;

-- 3. Row Level Security (RLS)
-- For public demo purposes, we will allow read access to authenticated roles
-- In a strict production system, you would tie these to specific user_ids

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to anyone" ON public.repositories FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.audit_log FOR SELECT USING (true);

-- User secrets: only the owner can read/write their own secrets
CREATE POLICY "Allow users to manage their own secrets" ON public.user_secrets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure service_role (backend) can do everything
CREATE POLICY "Allow service_role full access" ON public.repositories USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON public.incidents USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON public.reports USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON public.audit_log USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access to secrets" ON public.user_secrets USING (auth.role() = 'service_role');


COMMIT;
