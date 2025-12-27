import { AlertTriangle } from 'lucide-react';

import { Card } from '@/components/ui/card';

type RoutesErrorStateProps = {
  message: string;
};

export function RoutesErrorState({ message }: RoutesErrorStateProps) {
  return (
    <div className="mt-6">
      <Card className="bg-card border-border p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-status-poor mt-0.5 h-5 w-5" />
          <div className="space-y-1">
            <div className="text-foreground text-sm font-medium">Unable to load routes</div>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
