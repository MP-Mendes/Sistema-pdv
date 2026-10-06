export interface CashMovementValue {
  tipo: 'venda' | 'suprimento' | 'sangria' | 'estorno';
  valor: number | string;
}

export function calculateCashBalance(openingValue: number | string, movements: CashMovementValue[] = []) {
  return movements.reduce((total, movement) => {
    const value = Number(movement.valor);
    if (!Number.isFinite(value)) return total;
    return total + (movement.tipo === 'venda' || movement.tipo === 'suprimento' ? value : -value);
  }, Number(openingValue) || 0);
}

export function quantitiesAreAvailable(
  items: Array<{ quantidade: number; produto: { estoque: number } }>
) {
  return items.every((item) => item.quantidade > 0 && item.quantidade <= Number(item.produto.estoque));
}

export function paymentDifference(total: number, payments: Array<{ valor: number }>) {
  const paid = payments.reduce((sum, payment) => sum + Number(payment.valor || 0), 0);
  return Math.round((total - paid) * 100) / 100;
}
