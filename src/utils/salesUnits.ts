export interface SaleUnitProduct {
  unit?: string;
  piecesPerUnit?: number;
  buyPrice?: number;
  sellPrice?: number;
}

export interface SaleUnitItem {
  unit?: string;
  isPiece?: boolean;
  piecesPerUnit?: number;
  unitPrice?: number;
  costPrice?: number;
  quantity?: number;
}

export function resolveSaleUnit(item: SaleUnitItem, product?: SaleUnitProduct) {
  const itemPiecesPerUnit = Number(item.piecesPerUnit) || 0;
  const productPiecesPerUnit = Number(product?.piecesPerUnit) || 1;
  const piecesPerUnit = Math.max(
    1,
    itemPiecesPerUnit > 1 ? itemPiecesPerUnit : productPiecesPerUnit,
  );
  const baseUnit = product?.unit?.toLowerCase();
  const itemUnit = item.unit?.toLowerCase();
  const isLegacyPiecePrice =
    baseUnit !== "piece" &&
    (!itemUnit || itemUnit === baseUnit) &&
    piecesPerUnit > 1 &&
    Number(product?.sellPrice) > 0 &&
    Math.abs(
      Number(item.unitPrice) - Number(product?.sellPrice) / piecesPerUnit,
    ) <= Math.max(0.01, (Number(product?.sellPrice) / piecesPerUnit) * 0.02);
  const isPiece =
    baseUnit !== "piece" &&
    (item.isPiece === true ||
      item.unit?.toLowerCase() === "piece" ||
      isLegacyPiecePrice);
  const unit = isPiece ? "Piece" : item.unit || product?.unit || "Unit";
  const costPrice = isPiece
    ? Number(item.costPrice) > 0
      ? Number(product?.buyPrice) > 0 &&
        Number(item.costPrice) >= Number(product.buyPrice) * 0.99
        ? Number(item.costPrice) / piecesPerUnit
        : Number(item.costPrice)
      : (Number(product?.buyPrice) || 0) / piecesPerUnit
    : (item.costPrice ?? Number(product?.buyPrice) ?? 0);

  return { unit, isPiece, piecesPerUnit, costPrice };
}

export function calculateSaleLine(
  item: SaleUnitItem,
  product?: SaleUnitProduct,
) {
  const resolved = resolveSaleUnit(item, product);
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const revenue = quantity * unitPrice;
  const cost = quantity * resolved.costPrice;

  return {
    ...resolved,
    quantity,
    revenue,
    cost,
    profit: revenue - cost,
    baseUnitQuantity: resolved.isPiece
      ? quantity / resolved.piecesPerUnit
      : quantity,
  };
}

export function formatVolume(qty: number, maxDecimals: number = 3): string {
  if (isNaN(qty) || qty === 0) return "0";
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((qty + Number.EPSILON) * factor) / factor;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatProductVolume(
  quantity: number,
  unit?: string,
  maxDecimals: number = 3,
): string {
  const formatted = formatVolume(quantity, maxDecimals);
  const displayUnit = unit || "Unit";
  return `${formatted} ${displayUnit}`;
}
