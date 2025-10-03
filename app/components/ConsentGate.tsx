"use client";

import { ReactNode } from "react";

export default function ConsentGate({
  children,
  label,
  consent,
}: {
  children: ReactNode;
  label?: string;
  consent?: string; // ✅ allow consent prop
}) {
  // For now, just render children — you can add conditional logic later
  return (
    <div>
      {label && <p className="text-sm text-gray-500 mb-2">{label}</p>}
      {children}
    </div>
  );
}
