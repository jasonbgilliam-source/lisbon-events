import React from "react";
import { useParams } from "next/navigation";
import ConsentGate from "../../components/ConsentGate";

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug;

  return (
    <Consent
