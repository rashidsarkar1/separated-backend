export interface CashMemoRow {
  quantity: number;
  unit: string;
  productName: string;
  unitPrice: number;
  total: number;
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function buildCashMemoRows(items: any[] = []): CashMemoRow[] {
  return items.map((item) => {
    const quantity = finiteNumber(item?.quantity);
    const unitPrice = finiteNumber(item?.unitPrice);
    return {
      quantity,
      unit: String(item?.unit || ""),
      productName: String(
        item?.productName ||
          item?.productId?.displayName ||
          item?.productId?.name ||
          "মালামাল",
      ),
      unitPrice,
      total: quantity * unitPrice,
    };
  });
}

export function getCashMemoGrandTotal(rows: CashMemoRow[]): number {
  return rows.reduce((sum, row) => sum + row.total, 0);
}
