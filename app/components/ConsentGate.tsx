"use client";

import React from "react";

type ConsentGateProps = {
  children: React.ReactNode;
  label?: string;
};

export default function ConsentGate({ children, label }: ConsentGateProps) {
  return (
    <div>
      {label && <div className="text-sm text-gray-500 mb-2">{label}</div>}
      {children}
    </div>
  );
}
