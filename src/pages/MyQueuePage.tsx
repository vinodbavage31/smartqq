import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { Clock, Store, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface QueueSlot {
  id: string;
  business_id: string;
  position: number;
  status: string;
  slot_date: string;
  service_requested: string | null;
  notes_to_customer: string | null;
  alert_sent: boolean;
  booked_at: string;
  businesses?: { name: string; avg_slot_duration_minutes: number; category: string };
}

const MyQueuePage = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<QueueSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSlots();

    const channel = supabase
      .channel('my-queue-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_slots',
        filter: `customer_id=eq.${user.id}`,
      }, () => {
        fetchSlots();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchSlots = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('queue_slots')
      .select('*, businesses(name, avg_slot_duration_minutes, category)')
      .eq('customer_id', user.id)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('slot_date', { ascending: true })
      .order('position', { ascending: true });
    setSlots((data as any[]) || []);
    setLoading(false);
  };

  const cancelSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('queue_slots')
      .update({ status: 'cancelled' })
      .eq('id', slotId);
    if (error) toast.error('Failed to cancel');
    else {
      toast.success('Slot cancelled');
      fetchSlots();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold mb-6">My Queue</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-lg">No active bookings</h3>
            <p className="text-sm text-muted-foreground">Discover services and join a queue to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map(slot => {
              const biz = slot.businesses;
              const isUpNext = slot.status === 'in_progress';
              const waitMin = (slot.position - 1) * (biz?.avg_slot_duration_minutes || 15);

              return (
                <Card key={slot.id} className={isUpNext ? 'border-status-in-progress animate-pulse-glow' : ''}>
                  {isUpNext && (
                    <div className="bg-status-in-progress text-primary-foreground px-4 py-2 rounded-t-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-display font-semibold text-sm">Get Ready — You're Up Next!</span>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-display font-semibold">{biz?.name || 'Business'}</h3>
                        <p className="text-xs text-muted-foreground">{slot.slot_date} • {biz?.category}</p>
                      </div>
                      <StatusBadge status={slot.status} />
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                      <span>Position: #{slot.position}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{waitMin} min wait</span>
                    </div>
                    {slot.service_requested && (
                      <p className="text-sm mb-2"><span className="text-muted-foreground">Service:</span> {slot.service_requested}</p>
                    )}
                    {slot.notes_to_customer && (
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-2 text-sm mb-2">
                        📋 {slot.notes_to_customer}
                      </div>
                    )}
                    {['pending', 'confirmed'].includes(slot.status) && (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => cancelSlot(slot.id)}>
                        Cancel Slot
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyQueuePage;
