import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Package, 
  AlertTriangle, 
  Layers, 
  Store, 
  Receipt, 
  Trash2,
  Barcode,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateProduct, fetchProducts, deleteProductThunk } from '../store/slices/inventorySlice';
import { fetchDealers } from '../store/slices/dealerSlice';
import { SearchableDealerSelect } from '../components/common/SearchableDealerSelect';
import { DealerReceiptUploader } from '../components/common/DealerReceiptUploader';

interface EditProductProps {
  productId: string | null;
  onBack: () => void;
  onUpdated: () => void;
}

export function EditProduct({ productId, onBack, onUpdated }: EditProductProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector(state => state.inventory);
  const { dealers } = useAppSelector(state => state.dealers);

  const product = products.find(p => (p._id === productId || p.id === productId));

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    category: '',
    unit: 'Unit',
    piecesPerUnit: '1',
    buyPrice: '',
    sellPrice: '',
    dealerId: '',
    quantity: '0',
    lowStockThreshold: '15',
    sku: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchDealers({ page: 1, limit: 200, range: 'all' }));
    if (products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, products.length]);

  useEffect(() => {
    if (product) {
      const defaultPieces = product.piecesPerUnit !== undefined 
        ? product.piecesPerUnit 
        : (product.unit?.toLowerCase() === 'dozen' ? 12 : 1);

      setFormData({
        name: product.name || '',
        displayName: product.displayName || product.name || '',
        category: product.category || 'General',
        unit: product.unit || 'Unit',
        piecesPerUnit: defaultPieces.toString(),
        buyPrice: (product.buyPrice ?? '').toString(),
        sellPrice: (product.sellPrice ?? '').toString(),
        dealerId: product.dealerId || '',
        quantity: (product.quantity ?? 0).toString(),
        lowStockThreshold: (product.lowStockThreshold ?? 15).toString(),
        sku: product.sku || ''
      });
    }
  }, [product]);

  // Handle unit selection with smart pieces default
  const handleUnitChange = (val: string) => {
    let pieces = formData.piecesPerUnit;
    const lower = val.toLowerCase();
    if (lower === 'dozen') {
      pieces = '12';
    } else if (['box', 'packed', 'carton'].includes(lower) && (!pieces || pieces === '1')) {
      pieces = '10';
    }
    setFormData(prev => ({ ...prev, unit: val, piecesPerUnit: pieces }));
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  const unitTypes = ['Unit', 'Dozen', 'Packed', 'Piece', 'Box', 'Kilogram', 'Gram', 'Liter', 'Meter', 'Carton'];

  // Profit calculation preview
  const buyNum = parseFloat(formData.buyPrice) || 0;
  const sellNum = parseFloat(formData.sellPrice) || 0;
  const unitProfit = sellNum - buyNum;
  const marginPercent = sellNum > 0 ? ((unitProfit / sellNum) * 100).toFixed(1) : '0';
  const markupPercent = buyNum > 0 ? ((unitProfit / buyNum) * 100).toFixed(1) : '0';

  // Secondary Unit (Pieces) calculation
  const piecesCount = Math.max(1, parseInt(formData.piecesPerUnit) || 1);
  const isMultiPieceUnit = ['dozen', 'box', 'packed', 'carton'].includes(formData.unit.toLowerCase()) || piecesCount > 1;
  const pieceBuyPrice = buyNum / piecesCount;
  const pieceSellPrice = sellNum / piecesCount;
  const pieceProfit = unitProfit / piecesCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error("No product selected");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Product Name is required");
      return;
    }
    if (!formData.buyPrice || buyNum < 0) {
      toast.error("Valid Buy Price is required");
      return;
    }
    if (!formData.sellPrice || sellNum < 0) {
      toast.error("Valid Sell Price is required");
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(updateProduct({
        id: productId,
        productData: {
          name: formData.name.trim(),
          displayName: formData.displayName.trim() || formData.name.trim(),
          category: formData.category.trim() || 'General',
          unit: formData.unit,
          piecesPerUnit: piecesCount,
          buyPrice: buyNum,
          sellPrice: sellNum,
          quantity: parseInt(formData.quantity) || 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 15,
          dealerId: formData.dealerId || product?.dealerId || 'unknown',
          sku: formData.sku.trim() || product?.sku
        }
      })).unwrap();

      toast.success("Product Updated Successfully", {
        description: `Changes to ${formData.name} were saved.`
      });

      onUpdated();
    } catch (err: any) {
      toast.error("Failed to update product", { description: err.message || "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!productId) return;
    if (window.confirm(`Are you sure you want to archive ${product?.name}?`)) {
      try {
        await dispatch(deleteProductThunk(productId)).unwrap();
        toast.success("Product Archived");
        onBack();
      } catch (err: any) {
        toast.error("Failed to archive product", { description: err.message });
      }
    }
  };

  if (!product && products.length > 0) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product you are trying to edit could not be located.</p>
        <Button onClick={onBack} className="bg-indigo-600 text-white">Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onBack}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Product</h1>
            <p className="text-xs text-slate-500 font-medium">Update all product specifications, pricing, receipt title, and stock levels.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={handleArchive}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Archive
          </Button>
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 h-10 rounded-xl shadow-md shadow-indigo-100"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Product Identification */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Product Identification
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Update the product's internal name and the customer-facing receipt display name.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Internal Product Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Product Name (Internal) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-normal text-slate-400">Used for inventory, search & reports</span>
                </label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. UltraWide Gaming Monitor 34-Inch Curved"
                  className="h-11 border-slate-200 bg-white focus:border-indigo-500 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Receipt Display Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    Receipt Display Name
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Shows on Invoice / Receipt
                  </span>
                </label>
                <Input 
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Short name for customer receipt..."
                  className="h-11 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  This custom title will appear on printed sales receipts and live customer invoices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Category
                </label>
                <div className="relative">
                  <Input 
                    list="edit-category-list"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Search or enter category..."
                    className="h-11 border-slate-200 bg-white rounded-xl text-sm"
                  />
                  <datalist id="edit-category-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Unit of Measurement
                </label>
                <Select 
                  value={formData.unit}
                  onValueChange={val => setFormData({ ...formData, unit: val })}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-sm">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-slate-500" />
                  SKU / Barcode
                </label>
                <Input 
                  value={formData.sku}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. SKU-MON-3401"
                  className="h-11 border-slate-200 bg-white rounded-xl font-mono text-sm uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Supplier Information */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Supplier & Dealer Assignment
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Assign or change the authorized wholesale supplier for this SKU.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Authorized Supplier / Dealer <span className="text-rose-500">*</span>
              </label>
              <SearchableDealerSelect
                value={formData.dealerId}
                onChange={(dealerId) => setFormData({ ...formData, dealerId })}
                placeholder="Search or select a dealer..."
                required
              />
            </div>
            {productId && (
              <DealerReceiptUploader
                productId={productId}
                productName={formData.name}
                dealerId={formData.dealerId}
                dealerName={
                  dealers.find(
                    (dealer) =>
                      String(dealer._id || dealer.id) === String(formData.dealerId),
                  )?.name
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Section 3: Pricing & Real-time Profit Preview */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <TakaIcon className="w-5 h-5 text-emerald-600 text-lg" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Pricing & Profit Margin
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Update wholesale procurement cost and standard selling price.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Buy Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Buy / Cost Price (৳) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <TakaIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 text-sm" />
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.buyPrice}
                    onChange={e => setFormData({ ...formData, buyPrice: e.target.value })}
                    placeholder="0.00"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Sell Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  Sell / Retail Price (৳) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <TakaIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 text-sm" />
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellPrice}
                    onChange={e => setFormData({ ...formData, sellPrice: e.target.value })}
                    placeholder="0.00"
                    className="pl-9 h-11 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-bold text-indigo-700"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Profit Margin Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Calculated Profitability Metrics
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Unit Profit</span>
                  <span className={`text-lg font-black ${unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ${unitProfit.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Profit Margin</span>
                  <span className={`text-lg font-black ${parseFloat(marginPercent) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {marginPercent}%
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Markup</span>
                  <span className={`text-lg font-black ${parseFloat(markupPercent) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    {markupPercent}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Stock & Inventory Management */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Inventory & Stock Management
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Directly adjust current stock quantity and low-stock warning threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Current Stock */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Current Stock on Hand
                </label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Low Stock Alert Threshold */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Low Stock Alert Threshold
                </label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <Input 
                    type="number"
                    min="1"
                    value={formData.lowStockThreshold}
                    onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="15"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-4">
          <Button 
            type="button"
            variant="outline"
            onClick={onBack}
            className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-wider"
          >
            ← Back to Inventory
          </Button>

          <Button 
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-8 h-11 rounded-xl shadow-lg shadow-indigo-100 gap-2"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
