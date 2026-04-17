'use client';

import { useState, useEffect } from 'react';
import { GITHUB_TOKEN_KEY } from '@/lib/constants';

export function useGithubToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(GITHUB_TOKEN_KEY));
  }, []);

  const save = (t: string) => {
    localStorage.setItem(GITHUB_TOKEN_KEY, t);
    setToken(t);
  };

  const clear = () => {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setToken(null);
  };

  return { token, save, clear, isConfigured: !!token };
}
