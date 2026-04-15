"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LiveStatusBadge } from "@/components/shared/live-status-badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace configuration, integrations, and notification preferences — structured for enterprise change control.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile</CardTitle>
            <CardDescription className="text-xs">Operator identity and session posture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Session</span>
              <LiveStatusBadge status="healthy" label="jwt" />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span>Theme</span>
              <span className="font-mono text-xs text-foreground">system</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Integrations</CardTitle>
            <CardDescription className="text-xs">GitHub, Slack, email, and model providers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">GitHub</div>
                <div className="text-xs text-muted-foreground">PAT + webhook secret</div>
              </div>
              <LiveStatusBadge status="healthy" label="connected" />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Slack</div>
                <div className="text-xs text-muted-foreground">Incoming webhook</div>
              </div>
              <LiveStatusBadge status="healthy" label="connected" />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">SendGrid</div>
                <div className="text-xs text-muted-foreground">Transactional email</div>
              </div>
              <LiveStatusBadge status="degraded" label="pending verify" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notifications</CardTitle>
          <CardDescription className="text-xs">Control noise without losing critical signals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Critical incidents</div>
              <div className="text-xs text-muted-foreground">Push + email + Slack</div>
            </div>
            <Switch checked aria-label="Critical incidents notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">QA failures</div>
              <div className="text-xs text-muted-foreground">Include CI logs excerpt</div>
            </div>
            <Switch checked aria-label="QA failures notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Weekly executive digest</div>
              <div className="text-xs text-muted-foreground">MTTR/MTTD trends and backlog</div>
            </div>
            <Switch aria-label="Weekly executive digest" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
