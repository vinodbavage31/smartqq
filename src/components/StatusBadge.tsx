import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-status-pending text-foreground' },
  confirmed: { label: 'Confirmed', className: 'bg-status-confirmed text-primary-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-status-in-progress text-primary-foreground' },
  completed: { label: 'Completed', className: 'bg-status-completed text-primary-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-status-cancelled text-primary-foreground' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge className={cn('text-xs font-medium border-0', config.className)}>
      {config.label}
    </Badge>
  );
};
