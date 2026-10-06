import { describe, expect, it } from 'vitest';
import { calculateCashBalance, paymentDifference, quantitiesAreAvailable } from './business';

describe('regras operacionais do PDV', () => {
  it('calcula o saldo do caixa considerando entradas e saídas', () => {
    expect(calculateCashBalance(100, [
      { tipo: 'venda', valor: 50 },
      { tipo: 'suprimento', valor: 20 },
      { tipo: 'sangria', valor: 30 },
      { tipo: 'estorno', valor: 10 },
    ])).toBe(130);
  });

  it('valida quantidades inteiras e fracionadas contra o estoque', () => {
    expect(quantitiesAreAvailable([{ quantidade: 0.75, produto: { estoque: 1.5 } }])).toBe(true);
    expect(quantitiesAreAvailable([{ quantidade: 2, produto: { estoque: 1.5 } }])).toBe(false);
    expect(quantitiesAreAvailable([{ quantidade: 0, produto: { estoque: 10 } }])).toBe(false);
  });

  it('compara pagamentos com precisão de centavos', () => {
    expect(paymentDifference(10, [{ valor: 3.33 }, { valor: 6.67 }])).toBe(0);
    expect(paymentDifference(10, [{ valor: 9.5 }])).toBe(0.5);
  });
});
