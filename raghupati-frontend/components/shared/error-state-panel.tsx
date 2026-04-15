import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorStatePanelProps = {
  title: string;
  description: string;
};

export function ErrorStatePanel({ title, description }: ErrorStatePanelProps) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-red-900 dark:text-red-100">
          <AlertTriangle className="size-4" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-red-900/80 dark:text-red-100/80">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        If you are running locally, confirm <span className="font-mono">NEXT_PUBLIC_USE_MOCKS</span> and API base URL
        settings.
      </CardContent>
    </Card>
  );
}
