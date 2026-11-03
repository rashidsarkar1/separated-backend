import React, { useState, useEffect, useRef } from "react";
import { User, Search, ChevronDown, Check, X, Phone, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { apiService } from "../../services/apiService";
import { useAppSelector } from "../../store/hooks";
import { cn } from "../../lib/utils";

interface SearchableCustomerSelectProps {
  value: string;
  onChange: (customerId: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableCustomerSelect({
  value,
  onChange,
  placeholder = "Select or search customer account...",
  className,
}: SearchableCustomerSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { customers: storeCustomers } = useAppSelector((state) => state.customers);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>(storeCustomers || []);
  const [loading, setLoading] = useState(false);

  // Sync initial customers from Redux store if available
  useEffect(() => {
    if (storeCustomers && storeCustomers.length > 0 && !searchQuery.trim()) {
      setCustomers(storeCustomers);
    }
  }, [storeCustomers, searchQuery]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Backend search with debounce
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        // Call backend API with search query and limit 100
        const response = await apiService.getCustomers(searchQuery.trim(), 1, 100, "all");
        if (active) {
          const list = response?.data || [];
          setCustomers(list);
        }
      } catch (err) {
        console.warn("Failed to search customers from backend:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Find currently selected customer object
  const selectedCustomer =
    value === "unknown"
      ? null
      : customers.find((c) => (c._id || c.id) === value) ||
        storeCustomers.find((c) => (c._id || c.id) === value);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          "w-full h-10 md:h-11 border rounded-xl px-3 bg-white flex items-center justify-between text-xs md:text-sm transition-all cursor-pointer shadow-sm select-none",
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-100"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <User className="w-4 h-4 text-indigo-600 shrink-0" />
          {value === "unknown" || !value ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-800 uppercase tracking-tight truncate">
                Walk-in Customer (Unknown)
              </span>
            </div>
          ) : selectedCustomer ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-800 uppercase tracking-tight truncate">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.phone && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0 hidden sm:inline">
                  {selectedCustomer.phone}
                </span>
              )}
              {selectedCustomer.dueBalance > 0 && (
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                  Due: ৳{selectedCustomer.dueBalance.toLocaleString()}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && value !== "unknown" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("unknown");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Reset to Walk-in Customer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer by name or phone..."
                className="pl-9 pr-8 h-9 text-xs bg-white border-slate-200 rounded-lg focus:border-indigo-500 font-medium"
              />
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5 font-bold uppercase tracking-wider">
              <span>Customer Accounts</span>
              <span>
                {loading
                  ? "Searching DB..."
                  : `${customers.length} Found`}
              </span>
            </div>
          </div>

          {/* Customer List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 p-1">
            {/* Pinned Walk-in Customer option */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onChange("unknown");
                setIsOpen(false);
                setSearchQuery("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange("unknown");
                  setIsOpen(false);
                  setSearchQuery("");
                }
              }}
              className={cn(
                "px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between transition-colors text-left",
                value === "unknown" || !value
                  ? "bg-indigo-50 text-indigo-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700",
              )}
            >
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-xs uppercase">
                  Walk-in Customer (Unknown)
                </span>
              </div>
              {(value === "unknown" || !value) && (
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
            </div>

            {customers
              .filter((c) => (c._id || c.id) !== "unknown")
              .map((c) => {
                const customerId = c._id || c.id;
                const isSelected = customerId === value;
                return (
                  <div
                    key={customerId}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onChange(customerId);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(customerId);
                        setIsOpen(false);
                        setSearchQuery("");
                      }
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors text-left",
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700",
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">
                          {c.name}
                        </span>
                        {isSelected && (
                          <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 rounded h-4 font-bold border-none">
                            Selected
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 font-normal">
                        {c.phone && (
                          <span className="flex items-center gap-1 font-mono text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </span>
                        )}
                        {c.dueBalance !== undefined && c.dueBalance > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Due: ৳{c.dueBalance.toLocaleString()} (বকেয়া)
                          </span>
                        )}
                        {c.advanceBalance !== undefined && c.advanceBalance > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Adv: ৳{c.advanceBalance.toLocaleString()} (অগ্রিম)
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })}

            {customers.filter((c) => (c._id || c.id) !== "unknown").length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs space-y-2">
                <User className="w-8 h-8 mx-auto text-slate-200" />
                <p className="font-medium">
                  {searchQuery.trim()
                    ? `No customer found matching "${searchQuery}"`
                    : "No registered customers found."}
                </p>
                {searchQuery.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-xs h-7 border-slate-200"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

