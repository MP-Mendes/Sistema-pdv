'use client';

import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useUIStore } from '@/store/uiStore';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setSidebarOpen(!media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [setSidebarOpen]);

  return <div className="min-h-screen bg-slate-50"><Sidebar /><main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} min-w-0 transition-[margin] duration-300`}>{children}</main></div>;
}
