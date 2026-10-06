'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { SessionData } from '@/lib/auth';

export default function DashboardSessionProvider({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    setSession(session);
  }, [session, setSession]);

  return children;
}
