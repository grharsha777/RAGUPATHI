-- ══════════════════════════════════════════════════════════════
-- RAGHUPATHI — Complete Idempotent Supabase Migration
-- Run this in Supabase SQL Editor. Safe to run multiple times.
-- ══════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum Types ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('pending', 'running', 'complete', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved', 'auto_fixed', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_status AS ENUM ('up', 'down', 'degraded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Users (extended profiles) ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,          -- references auth.users(id) 
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  auth_provider TEXT,                 -- 'github' | 'google'
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── User Tokens (encrypted GitHub PATs and integration creds) ─
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_type TEXT NOT NULL,           -- 'github_pat' | 'slack_webhook' | 'discord_webhook' | 'resend_api_key'
  encrypted_value TEXT NOT NULL,      -- pgcrypto encrypted
  metadata JSONB DEFAULT '{}',       -- e.g. { "github_username": "...", "verified": true, "scopes": [...] }
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token_type)
);
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_type ON user_tokens(token_type);

-- ── Repositories ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,            -- 'owner/repo'
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  description TEXT,
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  open_issues INT DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  webhook_active BOOLEAN DEFAULT FALSE,
  webhook_id TEXT,
  last_scan_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  risk_score FLOAT DEFAULT 0,
  dependency_health TEXT DEFAULT 'unknown',
  ci_health TEXT DEFAULT 'unknown',
  branch_protection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, full_name)
);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repositories(full_name);

-- ── Webhooks (delivery log) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  delivery_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB,
  signature_valid BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_repo_id ON webhooks(repository_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON webhooks(created_at DESC);

-- ── Agent Runs (per-agent execution status) ──────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,               -- groups all agents for one scan
  agent_name TEXT NOT NULL,            -- 'hanuman' | 'rama' | 'lakshmana' | 'sita' | 'jambavan' | 'nala' | 'sugreeva' | 'bharata' | 'shatrughna' | 'vibhishana' | 'dasharatha'
  status agent_status DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output JSONB DEFAULT '{}',           -- full agent output
  error TEXT,
  duration_ms INT,
  model_used TEXT,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_run_id ON agent_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);

-- ── Scan Runs (groups agent_runs for a single scan) ──────────
CREATE TABLE IF NOT EXISTS scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL,
  trigger_type TEXT DEFAULT 'manual',  -- 'manual' | 'webhook' | 'scheduled'
  status TEXT DEFAULT 'pending',  -- 'idle' | 'pending' | 'running' | 'complete' | 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  summary JSONB DEFAULT '{}',
  vulnerabilities_found INT DEFAULT 0,
  patches_generated INT DEFAULT 0,
  pr_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS repo_full_name TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idle';
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_scan_runs_user ON scan_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_runs_repo ON scan_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_scan_runs_status ON scan_runs(status);

-- ── Incidents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  repo_full_name TEXT NOT NULL,
  scan_run_id UUID REFERENCES scan_runs(id) ON DELETE SET NULL,
  severity severity_level DEFAULT 'medium',
  status incident_status DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  cve_id TEXT,
  cvss_score FLOAT,
  package_name TEXT,
  package_version TEXT,
  fixed_version TEXT,
  agent_assigned TEXT,
  payload JSONB DEFAULT '{}',
  pr_url TEXT,
  patch_confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS repo_full_name TEXT;
CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_repo ON incidents(repo_full_name);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_cve ON incidents(cve_id);

-- ── Patches ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  scan_run_id UUID REFERENCES scan_runs(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  original_content TEXT,
  patched_content TEXT,
  diff_text TEXT,
  tests_added TEXT,
  lint_passed BOOLEAN,
  syntax_valid BOOLEAN,
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patches_incident ON patches(incident_id);
CREATE INDEX IF NOT EXISTS idx_patches_scan ON patches(scan_run_id);

-- ── Audit Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,               -- 'token_verified', 'scan_triggered', 'pr_created', etc.
  resource_type TEXT,                 -- 'repository', 'incident', 'agent_run', etc.
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,              -- 'slack' | 'discord' | 'email' | 'github_pr'
  status TEXT DEFAULT 'pending',      -- 'pending' | 'sent' | 'failed'
  payload JSONB DEFAULT '{}',
  response_code INT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_incident ON notifications(incident_id);

-- ── Log Events (real pipeline execution logs) ────────────────
CREATE TABLE IF NOT EXISTS log_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
  agent_name TEXT,
  level TEXT NOT NULL DEFAULT 'info',    -- 'debug' | 'info' | 'warn' | 'error' | 'success'
  source TEXT NOT NULL DEFAULT 'pipeline', -- 'pipeline' | 'agent' | 'github' | 'system'
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_log_events_scan ON log_events(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_log_events_created ON log_events(created_at DESC);
ALTER TABLE log_events ENABLE ROW LEVEL SECURITY;

-- ── Custom Agents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  runs_after TEXT DEFAULT 'vibhishana', -- which built-in agent this follows
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE custom_agents ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_custom_agents_user ON custom_agents(user_id);

-- ── Uptime Checks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,         -- 'api_server' | 'webhook_receiver' | 'agent_pipeline' | etc.
  status service_status DEFAULT 'up',
  response_time_ms INT,
  checked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_uptime_service ON uptime_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_uptime_checked ON uptime_checks(checked_at DESC);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_checks ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies (users see only their own data) ─────────────
-- Drop existing policies first to make this idempotent
DO $$ BEGIN
  DROP POLICY IF EXISTS "users_own_data" ON users;
  DROP POLICY IF EXISTS "tokens_own_data" ON user_tokens;
  DROP POLICY IF EXISTS "repos_own_data" ON repositories;
  DROP POLICY IF EXISTS "scans_own_data" ON scan_runs;
  DROP POLICY IF EXISTS "incidents_own_data" ON incidents;
  DROP POLICY IF EXISTS "patches_own_data" ON patches;
  DROP POLICY IF EXISTS "audit_own_data" ON audit_logs;
  DROP POLICY IF EXISTS "notifications_own_data" ON notifications;
  DROP POLICY IF EXISTS "custom_agents_own_data" ON custom_agents;
  DROP POLICY IF EXISTS "uptime_public_read" ON uptime_checks;
  DROP POLICY IF EXISTS "agent_runs_via_scan" ON agent_runs;
  DROP POLICY IF EXISTS "webhooks_via_repo" ON webhooks;
END $$;

-- Service role has full access; anon/authenticated users see their own rows
CREATE POLICY "users_own_data" ON users FOR ALL 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "tokens_own_data" ON user_tokens FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "repos_own_data" ON repositories FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "scans_own_data" ON scan_runs FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "incidents_own_data" ON incidents FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "patches_own_data" ON patches FOR ALL 
  USING (incident_id IN (SELECT id FROM incidents WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

CREATE POLICY "audit_own_data" ON audit_logs FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "notifications_own_data" ON notifications FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "custom_agents_own_data" ON custom_agents FOR ALL 
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Agent runs are readable if user owns the scan
CREATE POLICY "agent_runs_via_scan" ON agent_runs FOR ALL 
  USING (run_id IN (SELECT id FROM scan_runs WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Webhooks are readable if user owns the repository
CREATE POLICY "webhooks_via_repo" ON webhooks FOR ALL 
  USING (repository_id IN (SELECT id FROM repositories WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())));

-- Uptime checks are publicly readable (status page)
CREATE POLICY "uptime_public_read" ON uptime_checks FOR SELECT 
  USING (true);

-- ── Realtime Publication ─────────────────────────────────────
-- Enable realtime for agent_runs and incidents so the frontend gets live updates
DO $$
BEGIN
  -- Drop and recreate to ensure clean state
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_runs;

-- ── Updated_at Trigger Function ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','user_tokens','repositories','incidents','agent_runs','scan_runs','custom_agents'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;
