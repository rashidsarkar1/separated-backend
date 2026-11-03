/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  ChevronLeft,
  Store,
  Zap,
  Tags,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'quick-sell', label: 'Quick Sell', icon: Zap },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart },
  { id: 'customer-analytics', label: 'Customer Analytics', icon: Users },
  { id: 'product-analytics', label: 'Product Analytics', icon: BarChart3 },
  { id: 'dealers', label: 'Dealers', icon: Store },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'categories', label: 'Categories', icon: Tags },
];

export function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out h-full border-r border-slate-800 shadow-2xl lg:shadow-none",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 shrink-0">
        <div className={cn("flex items-center gap-3 font-bold text-lg tracking-tight transition-opacity duration-300", collapsed ? "opacity-0 w-0" : "opacity-100")}>
          <div className="bg-indigo-500 text-white w-8 h-8 rounded flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <span className="truncate">Wholesale<span className="text-indigo-400">OS</span></span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={cn("text-slate-400 hover:text-white hover:bg-slate-800 hidden lg:flex", collapsed && "mx-auto")}
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                isActive 
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
