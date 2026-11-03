import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  label?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  label = 'records',
  className
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = totalItems !== undefined ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div className={cn("p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none", className)}>
      <div className="text-slate-500 font-medium tracking-tight">
        {totalItems !== undefined ? (
          <span>
            Showing <strong className="text-slate-800 font-bold">{totalItems === 0 ? 0 : startItem}</strong> to{' '}
            <strong className="text-slate-800 font-bold">{endItem}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{totalItems}</strong> {label}
          </span>
        ) : (
          <span>
            Page <strong className="text-slate-800 font-bold">{currentPage}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold text-xs">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <Button
                key={`page-${p}`}
                variant={isCurrent ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(p as number)}
                className={cn(
                  "h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all",
                  isCurrent 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-indigo-600" 
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                )}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
        </Button>
      </div>
    </div>
  );
}
