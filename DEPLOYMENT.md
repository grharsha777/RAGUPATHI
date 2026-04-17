# Deployment Checklist for RAGHUPATI

This guide covers the necessary steps to deploy RAGHUPATI to production using Vercel (frontend) and Railway (backend), along with a Supabase database instance.

## 1. Supabase (Database)
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In the **SQL Editor**, run the script provided in `supabase_migration.sql` to setup the database schemas and Row Level Security.
3. Once completed, run this command to enable the Realtime subscription for agent stream updates:
   ```sql
   alter publication supabase_realtime add table agent_events;
   ```
4. Collect the following keys from Project Settings -> API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. GitHub & Google OAuth Apps
**GitHub Setup**:
1. Go to Developer Settings -> OAuth Apps -> New OAuth App
2. Homepage URL: `https://your-vercel-domain.com`
3. Authorization Callback URL: `https://your-vercel-domain.com/api/auth/callback/github`
4. Generate the Client Secret. Use the Client ID and Secret in your `.env`.

**Google Setup**:
1. Go to Google Cloud Console.
2. Create Credentials -> OAuth Client ID.
3. Application Type: Web application.
4. Authorized Redirect URIs: `https://your-vercel-domain.com/api/auth/callback/google`
5. Collect the `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

## 3. Railway (Backend)
1. In your GitHub repository, Railway should connect to deploy the `backend/` directory.
2. Add the following to Railway environment variables (`Variables` tab):
   - All LLM API Keys (`MISTRAL_API_KEY`, `GROQ_API_KEY`, `HUGGINGFACE_TOKEN`)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `GITHUB_WEBHOOK_SECRET` and `NVD_API_KEY`
3. Railway uses the provided `railway.json` and `Procfile` at the backend root. The start command will automatically pick up `$PORT` natively.
4. Once deployed, note down the deployed Railway domain (e.g., `https://raghupati-backend.up.railway.app`).

## 4. Vercel (Frontend)
1. Connect Vercel to your Raghupati GitHub repository.
2. Set the build command to: `npm run build`
3. Set the root directory if necessary (leave at `raghupati-frontend` or root depending on where `package.json` is located).
4. Add the following environment variables to Vercel (NEVER commit these to Git):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `AUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
   - `NEXT_PUBLIC_API_BASE_URL` (Set this to the Railway domain from Step 3)
5. Deploy the application.

Done! If all is configured properly, the user should be able to login with Google/Github, add their personal access token, and reach the fully reactive dashboard with real live metrics.
