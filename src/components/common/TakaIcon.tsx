import React from "react";
import { cn } from "../../lib/utils";

export function TakaIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold select-none leading-none",
        className,
      )}
      aria-hidden="true"
    >
      ৳
    </span>
  );
}

