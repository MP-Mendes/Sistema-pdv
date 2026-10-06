'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Produto, CartItem, MetodoPagamento } from '@/lib/types';

interface CartState {
  items: CartItem[];
  clienteId: string | null;
  clienteNome: string | null;
  desconto: number;
  metodosPagamento: { metodo: MetodoPagamento; valor: number }[];
  addItem: (produto: Produto, quantidade?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQuantity: (produtoId: string, quantidade: number) => void;
  setCliente: (id: string | null, nome: string | null) => void;
  setDesconto: (desconto: number) => void;
  setMetodosPagamento: (metodos: { metodo: MetodoPagamento; valor: number }[]) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [],
  clienteId: null,
  clienteNome: null,
  desconto: 0,
  metodosPagamento: [],

  addItem: (produto, quantidade = 1) => {
    const safeQuantity = Math.min(Number(produto.estoque), Math.max(0, Number(quantidade) || 0));
    if (safeQuantity <= 0) return;
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.produto.id === produto.id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantidade = Math.min(
        Number(produto.estoque),
        newItems[existingIndex].quantidade + safeQuantity
      );
      newItems[existingIndex].subtotal = newItems[existingIndex].quantidade * produto.preco;
      set({ items: newItems });
    } else {
      set({
        items: [
          ...items,
          {
            produto,
            quantidade: safeQuantity,
            subtotal: safeQuantity * produto.preco,
          },
        ],
      });
    }
  },

  removeItem: (produtoId) => {
    set({ items: get().items.filter((item) => item.produto.id !== produtoId) });
  },

  updateQuantity: (produtoId, quantidade) => {
    if (quantidade <= 0) {
      get().removeItem(produtoId);
      return;
    }
    const items = get().items.map((item) => {
      if (item.produto.id !== produtoId) return item;
      const safeQuantity = Math.min(Number(item.produto.estoque), Number(quantidade) || 0);
      return { ...item, quantidade: safeQuantity, subtotal: safeQuantity * item.produto.preco };
    });
    set({ items });
  },

  setCliente: (id, nome) => set({ clienteId: id, clienteNome: nome }),

  setDesconto: (desconto) => set({ desconto }),

  setMetodosPagamento: (metodos) => set({ metodosPagamento: metodos }),

  clearCart: () =>
    set({
      items: [],
      clienteId: null,
      clienteNome: null,
      desconto: 0,
      metodosPagamento: [],
    }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    return get().getSubtotal() - get().desconto;
  },
}), {
  name: 'pdv-carrinho-v1',
  partialize: (state) => ({
    items: state.items,
    clienteId: state.clienteId,
    clienteNome: state.clienteNome,
    desconto: state.desconto,
    metodosPagamento: state.metodosPagamento,
  }),
}));
