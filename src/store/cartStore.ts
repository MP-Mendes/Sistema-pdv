'use client';

import { create } from 'zustand';
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

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  clienteId: null,
  clienteNome: null,
  desconto: 0,
  metodosPagamento: [],

  addItem: (produto, quantidade = 1) => {
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.produto.id === produto.id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantidade += quantidade;
      newItems[existingIndex].subtotal = newItems[existingIndex].quantidade * produto.preco;
      set({ items: newItems });
    } else {
      set({
        items: [
          ...items,
          {
            produto,
            quantidade,
            subtotal: quantidade * produto.preco,
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
    const items = get().items.map((item) =>
      item.produto.id === produtoId
        ? { ...item, quantidade, subtotal: quantidade * item.produto.preco }
        : item
    );
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
}));