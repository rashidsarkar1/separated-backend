/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Search, 
  Bell, 
  User as UserIcon,
  SearchIcon,
  Menu
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { mockUser } from '../../data/mock';

// We need DropdownMenu from shadcn, adding it now
// Wait, I didn't add dropdown-menu in the previous npx command.
// I'll use a simple button for now and add dropdown-menu later if needed.

export function Header({ activeTab, onMenuClick }: { activeTab: string, onMenuClick?: () => void }) {
  const getPageTitle = (id: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Overview',
      inventory: 'Inventory & Stock',
      'quick-sell': 'Quick Sell',
      'sales-orders': 'Sales History',
      dealers: 'Suppliers & Dealers',
      'dealer-receipts': 'Dealer Receipt Images',
      customers: 'Customer Directory',
      'customer-receipts': 'Receipt Archive',
      'product-receipts': 'Dealer Receipt Images',
      'product-details': 'Product Details',
      'add-product': 'Add Product',
      'edit-product': 'Edit Product',
      reports: 'Profit & Reports',
      categories: 'Categories',
      settings: 'System Settings'
    };
    return titles[id] || 'Dashboard';
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            type="search" 
            placeholder="Search products..." 
            className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-6 pr-6 border-r border-slate-100">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Server Status</p>
            <p className="text-xs font-semibold text-emerald-500 flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
            <Bell className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">Admin</p>
            <p className="text-xs text-slate-500 font-medium">Master Access</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
