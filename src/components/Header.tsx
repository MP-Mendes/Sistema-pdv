'use client';

import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { session } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right"><p className="text-sm font-medium text-slate-800">{session?.usuario?.nome}</p><p className="text-xs text-slate-500 capitalize">{session?.usuario?.role}</p></div>
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {session?.usuario?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
