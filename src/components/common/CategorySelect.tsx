import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { apiService } from "../../services/apiService";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  onQueryChange,
  placeholder = "Search categories...",
  className,
  allowCreate = true,
}: CategorySelectProps) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setOptions([]);
    setLoading(true);
    setLoadError("");
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiService.getCategories(query.trim(), 1, 10);
        if (active) {
          setOptions(
            Array.isArray(response?.data)
              ? response.data
                .map((category: { name?: string }) => category.name)
                .filter((name: string | undefined): name is string => Boolean(name))
              : [],
          );
        }
      } catch (error: any) {
        if (active) {
          setOptions([]);
          setLoadError(error.response?.data?.message || "Could not load categories");
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const exactMatch = options.some(
    (category) => category.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
  );

  const selectCategory = (category: string) => {
    setQuery(category);
    onChange(category);
    setOpen(false);
  };

  const addCategory = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const category = await apiService.createCategory(name);
      selectCategory(category.name);
      toast.success("Category added", { description: category.name });
    } catch (error: any) {
      toast.error("Could not add category", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (onQueryChange) {
            onQueryChange(event.target.value);
          } else {
            onChange(event.target.value);
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((category) => (
            <button
              key={category}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectCategory(category)}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {category}
            </button>
          ))}
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-400">Loading categories...</div>
          )}
          {!loading && loadError && (
            <div className="px-3 py-2 text-xs text-rose-600">{loadError}</div>
          )}
          {!loading && !loadError && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">No categories found.</div>
          )}
          {allowCreate && query.trim() && !exactMatch && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCategory}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating
                ? "Adding category..."
                : "Add new category"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}