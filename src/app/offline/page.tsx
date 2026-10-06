import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="max-w-md text-center"><WifiOff className="w-12 h-12 text-slate-500 mx-auto mb-4" /><h1 className="text-2xl font-bold text-slate-900">Sem conexão</h1><p className="mt-2 text-slate-600">O sistema não consegue acessar o servidor agora. Verifique a internet e tente novamente; o carrinho salvo neste dispositivo será mantido.</p></div></main>;
}
