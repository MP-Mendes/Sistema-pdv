'use client';

import {
  DollarSign,
  Package,
  Users,
  CreditCard,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UltimaVenda {
  id: string;
  numero_venda: number;
  total: number;
  created_at: string;
  cliente?: { nome: string } | null;
  itens?: { id: string }[];
}

interface DashboardContentProps {
  vendasHoje: number;
  totalProdutos: number;
  totalClientes: number;
  crediarioPendente: number;
  ultimasVendas: UltimaVenda[];
  vendasSemana: { dia: string; total: number }[];
}

export default function DashboardContent({
  vendasHoje,
  totalProdutos,
  totalClientes,
  crediarioPendente,
  ultimasVendas,
  vendasSemana,
}: DashboardContentProps) {
  const stats = [
    {
      label: 'Vendas Hoje',
      value: formatCurrency(vendasHoje),
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: 'Produtos',
      value: totalProdutos.toString(),
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Clientes',
      value: totalClientes.toString(),
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: 'Crediário Pendente',
      value: formatCurrency(crediarioPendente),
      icon: CreditCard,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart and Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Vendas da Semana</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendasSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Últimas Vendas</h2>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {ultimasVendas.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma venda registrada</p>
            ) : (
              ultimasVendas.map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      #{venda.numero_venda.toString().padStart(6, '0')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {venda.cliente?.nome || 'Cliente não identificado'} •{' '}
                      {formatDateTime(venda.created_at)}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(Number(venda.total))}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}