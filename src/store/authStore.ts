'use client';
import { create } from 'zustand';
import type { SessionData } from '@/lib/auth';

interface AuthState {
  session: SessionData | null;
  loading: boolean;
  setSession: (session: SessionData | null) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  setAuthLoading: (loading) => set({ loading }),
  logout: () => set({ session: null, loading: false }),
}));