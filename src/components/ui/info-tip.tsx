'use client';

import { HelpCircle } from 'lucide-react';

/** Ícono de ayuda (?) con tooltip al pasar el mouse. */
export function InfoTip({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`group relative inline-flex align-middle ${className}`}>
      <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground transition hover:text-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-xs leading-relaxed text-popover-foreground shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}
