"use client";

import React from "react";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function EmptyState({ title, description, actions }: Props) {
  return (
    <div className="rounded-2xl border bg-white/60 p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}