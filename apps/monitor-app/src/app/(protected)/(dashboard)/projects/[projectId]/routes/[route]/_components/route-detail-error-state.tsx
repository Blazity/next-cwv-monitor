import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";

type RouteDetailErrorStateProps = {
  message: string;
};

export function RouteDetailErrorState({ message }: RouteDetailErrorStateProps) {
  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-status-poor mt-0.5 h-5 w-5" />
        <div className="space-y-1">
          <div className="text-foreground text-sm font-medium">Unable to load route details</div>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </Card>
  );
}
