'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function PwaRegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;
  return <div role="status" className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg flex items-start gap-3"><WifiOff className="w-5 h-5 shrink-0 mt-0.5" /><span>Sem conexão. O carrinho fica salvo neste dispositivo; reconecte antes de finalizar a venda.</span></div>;
}
