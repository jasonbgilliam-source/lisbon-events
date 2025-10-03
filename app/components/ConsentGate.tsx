"use client";

import { ReactNode } from "react";

export default function ConsentGate({
  children,
  label,
  consent,
}: {
  children: ReactNode;
  label?: string;
  consent?: string;   // ✅ add this line
}) {
  // For now, we just ignore
