import type { Metadata } from "next";

import { IncidentDetailClient } from "@/components/incidents/incident-detail-client";

export const metadata: Metadata = {
  title: "Incident",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IncidentDetailClient incidentId={id} />;
}
