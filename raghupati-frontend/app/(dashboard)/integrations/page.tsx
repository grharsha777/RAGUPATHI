import type { Metadata } from "next";

import { GitHubSetupWizard } from "@/components/integrations/github-setup-wizard";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function IntegrationsPage() {
  return <GitHubSetupWizard />;
}
