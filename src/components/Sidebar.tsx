'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  LayoutDashboard, ShoppingCart, Package, Users, History, CreditCard,
  Tag, Settings, LogOut, ChevronLeft, ChevronRight, Shield, Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/vendas', icon: ShoppingCart, label: 'Vendas' },
  { href: '/dashboard/produtos', icon: Package, label: 'Produtos' },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { href: '/dashboard/historico', icon: History, label: 'Histórico' },
  { href: '/dashboard/crediario', icon: CreditCard, label: 'Crediário' },
  { href: '/dashboard/etiquetas', icon: Tag, label: 'Etiquetas' },
  { href: '/dashboard/customizacao', icon: Settings, label: 'Customização' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success('Logout realizado!');
      router.push('/');
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

  const isAdmin = session?.usuario?.role === 'admin';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-40 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg">PDV</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {sidebarOpen && session?.empresa && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-400">Empresa</p>
          <p className="text-sm font-medium truncate">{session.empresa.nome}</p>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <button
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
          {isAdmin && (
            <li>
              <button
                onClick={() => router.push('/dashboard/admin')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                  pathname.startsWith('/dashboard/admin') ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Admin</span>}
              </button>
            </li>
          )}
        </ul>
      </nav>

      <div className="border-t border-slate-700 p-4">
        {sidebarOpen && session?.usuario && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{session.usuario.nome}</p>
            <p className="text-xs text-slate-400 capitalize">{session.usuario.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}