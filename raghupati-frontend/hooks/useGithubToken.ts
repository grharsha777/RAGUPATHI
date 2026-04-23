'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to check if a GitHub token is verified and available.
 * Uses the GitHub API directly instead of localStorage — no fake states.
 */
export function useGithubToken() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const verify = useCallback(async (token: string) => {
    if (!token || token.length < 10) {
      setIsConfigured(false);
      setUsername(null);
      return false;
    }

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (res.status === 200) {
        const data = await res.json();
        setIsConfigured(true);
        setUsername(data.login);
        return true;
      }
    } catch (e) {
      console.error('GitHub token verification failed:', e);
    }

    setIsConfigured(false);
    setUsername(null);
    return false;
  }, []);

  const save = useCallback(async (token: string) => {
    const isValid = await verify(token);
    if (isValid) {
      setIsConfigured(true);
    }
  }, [verify]);

  useEffect(() => {
    // On mount, we just mark loading as false.
    // The actual token is stored server-side in Supabase, not in localStorage.
    // The settings page UI handles token verification via direct GitHub API calls.
    setLoading(false);
  }, []);

  return { isConfigured, username, loading, verify, save };
}
