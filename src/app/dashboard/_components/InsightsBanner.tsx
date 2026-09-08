'use client';

import { Sparkles } from 'lucide-react';

export function InsightsBanner({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="space-y-1.5 text-sm text-emerald-900">
          {insights.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
