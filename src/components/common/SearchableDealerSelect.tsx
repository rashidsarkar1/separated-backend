import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Store,
  Search,
  ChevronDown,
  Check,
  X,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { apiService } from "../../services/apiService";
import { useAppSelector } from "../../store/hooks";
import { cn } from "../../lib/utils";

interface SearchableDealerSelectProps {
  value: string;
  onChange: (dealerId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

function dealerIdOf(dealer: any) {
  return String(dealer?._id || dealer?.id || "");
}

export function SearchableDealerSelect({
  value,
  onChange,
  placeholder = "Search or select an Authorized Dealer...",
  className,
  required,
}: SearchableDealerSelectProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dealers: storeDealers = [] } = useAppSelector(
    (state) => state.dealers,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteDealers, setRemoteDealers] = useState<any[]>([]);
  const [selectedDealerRecord, setSelectedDealerRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const mergedDealers = useMemo(() => {
    const map = new Map<string, any>();
    [...storeDealers, ...remoteDealers].forEach((dealer) => {
      const id = dealerIdOf(dealer);
      if (id) map.set(id, dealer);
    });
    return Array.from(map.values());
  }, [storeDealers, remoteDealers]);

  const filteredDealers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return mergedDealers;
    return mergedDealers.filter((dealer) =>
      [
        dealer.name,
        dealer.address,
        dealer.contactInfo?.phone,
        dealer.contactInfo?.email,
        dealer.phone,
        dealer.email,
      ]
        .some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }, [mergedDealers, searchQuery]);

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 320 && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: 90,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await apiService.getDealers(
          1,
          10,
          "all",
          searchQuery.trim(),
        );
        if (active) {
          setRemoteDealers(response?.data || []);
        }
      } catch (err) {
        console.warn("Failed to search dealers from backend:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!value) {
      setSelectedDealerRecord(null);
      return;
    }

    const existing = mergedDealers.find(
      (dealer) => dealerIdOf(dealer) === String(value),
    );
    if (existing) {
      setSelectedDealerRecord(existing);
      return;
    }

    let active = true;
    apiService
      .getDealerById(value)
      .then((dealer) => {
        if (active && dealer) setSelectedDealerRecord(dealer);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [value, mergedDealers]);

  const selectedDealer =
    mergedDealers.find((dealer) => dealerIdOf(dealer) === String(value)) ||
    selectedDealerRecord;

  const selectDealer = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
          if (e.key === "Escape") setIsOpen(false);
        }}
        className={cn(
          "w-full min-h-11 border rounded-xl px-3 py-2 bg-white flex items-center justify-between text-sm transition-all cursor-pointer shadow-sm select-none",
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-100"
            : "border-slate-200 hover:border-slate-300",
          !selectedDealer && "text-slate-400 font-medium",
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <Store className="w-4 h-4 text-indigo-600 shrink-0" />
          {selectedDealer ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-800 truncate">
                {selectedDealer.name}
              </span>
              {selectedDealer.contactInfo?.phone && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0 hidden sm:inline">
                  {selectedDealer.contactInfo.phone}
                </span>
              )}
            </div>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDealer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear selection"
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

      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="opacity-0 w-0 h-0 absolute -z-10"
          tabIndex={-1}
        />
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search, then select a dealer..."
                  className="pl-9 pr-8 h-10 text-sm bg-white border-slate-200 rounded-lg focus:border-indigo-500 font-medium"
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
                <span>Select an authorized dealer</span>
                <span>
                  {loading
                    ? "Searching..."
                    : `${filteredDealers.length} option${filteredDealers.length === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1" role="listbox">
              {filteredDealers.length > 0 ? (
                filteredDealers.map((dealer) => {
                  const id = dealerIdOf(dealer);
                  const isSelected = id === String(value);
                  return (
                    <button
                      type="button"
                      key={id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectDealer(id)}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors text-left",
                        isSelected
                          ? "bg-indigo-50 text-indigo-900"
                          : "hover:bg-slate-50 text-slate-700",
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate">
                            {dealer.name}
                          </span>
                          {isSelected && (
                            <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 rounded h-4 font-bold border-none">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 font-normal">
                          {dealer.contactInfo?.phone && (
                            <span className="flex items-center gap-1 font-mono text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {dealer.contactInfo.phone}
                            </span>
                          )}
                          {dealer.address && (
                            <span className="flex items-center gap-1 text-slate-400 truncate max-w-[220px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {dealer.address}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                  <Store className="w-8 h-8 mx-auto text-slate-200" />
                  <p className="font-medium">
                    {searchQuery.trim()
                      ? `No dealers found matching "${searchQuery}"`
                      : "No dealers recorded yet. Add a dealer first."}
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
          </div>,
          document.body,
        )}
    </div>
  );
}
