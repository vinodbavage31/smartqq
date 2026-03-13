import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { Users, CheckCircle, Clock, PlayCircle, Store } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!biz) {
      setLoading(false);
      return;
    }
    setBusiness(biz);

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: slotData } = await supabase
      .from('queue_slots')
      .select('*, profiles(full_name)')
      .eq('business_id', biz.id)
      .eq('slot_date', today)
      .order('position', { ascending: true });
    setSlots((slotData as any[]) || []);
    setLoading(false);

    // Realtime subscription
    const channel = supabase
      .channel('owner-queue-' + biz.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_slots',
        filter: `business_id=eq.${biz.id}`,
      }, () => {
        refreshSlots(biz.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const refreshSlots = async (bizId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('queue_slots')
      .select('*, profiles(full_name)')
      .eq('business_id', bizId)
      .eq('slot_date', today)
      .order('position', { ascending: true });
    setSlots((data as any[]) || []);
  };

  const updateSlotStatus = async (slotId: string, status: string, customerId: string, note?: string) => {
    const updates: any = { status };
    if (note) updates.notes_to_customer = note;
    
    const { error } = await supabase
      .from('queue_slots')
      .update(updates)
      .eq('id', slotId);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    // Send notification
    let notifTitle = '';
    let notifMessage = '';
    if (status === 'confirmed') {
      const slot = slots.find(s => s.id === slotId);
      notifTitle = 'Slot Confirmed';
      notifMessage = `Your slot at ${business.name} is confirmed. You are number ${slot?.position} in the queue.`;
    } else if (status === 'in_progress') {
      notifTitle = "You're Up!";
      notifMessage = `It's your turn at ${business.name}. Please proceed.`;
    } else if (status === 'completed') {
      notifTitle = 'Service Complete';
      notifMessage = `Your service at ${business.name} is complete. Thank you!`;
    } else if (status === 'cancelled') {
      notifTitle = 'Slot Cancelled';
      notifMessage = `Your slot at ${business.name} has been cancelled by the business.`;
    }

    if (notifTitle) {
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: notifTitle,
        message: notifMessage,
        business_name: business.name,
      });
    }

    toast.success(`Status updated to ${status}`);
    if (business) refreshSlots(business.id);
  };

  const sendAlert = async (slotId: string, customerId: string) => {
    await supabase
      .from('queue_slots')
      .update({
        alert_sent: true,
        notes_to_customer: "You are up next! Please arrive at the shop within 10 minutes.",
      })
      .eq('id', slotId);

    await supabase.from('notifications').insert({
      user_id: customerId,
      title: "You're Up Next!",
      message: `Head over to ${business.name} now! Please arrive within 10 minutes.`,
      business_name: business.name,
    });

    toast.success('Alert sent to customer');
    if (business) refreshSlots(business.id);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
      </main>
    </div>
  );

  if (!business) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-16 text-center">
        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-xl font-semibold mb-2">No Business Set Up</h2>
        <p className="text-muted-foreground mb-4">Create your business profile to start managing queues.</p>
        <Button onClick={() => navigate('/owner/setup')}>Set Up Business</Button>
      </main>
    </div>
  );

  const pending = slots.filter(s => s.status === 'pending').length;
  const completed = slots.filter(s => s.status === 'completed').length;
  const active = slots.filter(s => !['completed', 'cancelled'].includes(s.status)).length;
  const current = slots.find(s => s.status === 'in_progress');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <h1 className="font-display text-2xl font-bold mb-6">Dashboard — {business.name}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold font-display">{active}</p>
              <p className="text-xs text-muted-foreground">In Queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-status-completed" />
              <p className="text-2xl font-bold font-display">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-status-pending" />
              <p className="text-2xl font-bold font-display">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <PlayCircle className="h-5 w-5 mx-auto mb-1 text-status-in-progress" />
              <p className="text-2xl font-bold font-display">{current ? `#${current.position}` : '—'}</p>
              <p className="text-xs text-muted-foreground">Current</p>
            </CardContent>
          </Card>
        </div>

        {/* Queue Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Today's Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No slots booked today.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map(slot => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-mono font-bold">#{slot.position}</TableCell>
                        <TableCell>{slot.profiles?.full_name || 'Customer'}</TableCell>
                        <TableCell className="text-sm">{slot.service_requested || '—'}</TableCell>
                        <TableCell><StatusBadge status={slot.status} /></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {slot.status === 'pending' && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateSlotStatus(slot.id, 'confirmed', slot.customer_id, 'Your slot is confirmed!')}>
                                Confirm
                              </Button>
                            )}
                            {slot.status === 'confirmed' && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateSlotStatus(slot.id, 'in_progress', slot.customer_id)}>
                                Start
                              </Button>
                            )}
                            {slot.status === 'in_progress' && (
                              <Button size="sm" variant="outline" className="text-xs h-7 text-status-completed" onClick={() => updateSlotStatus(slot.id, 'completed', slot.customer_id)}>
                                Complete
                              </Button>
                            )}
                            {!['completed', 'cancelled'].includes(slot.status) && !slot.alert_sent && (
                              <Button size="sm" variant="outline" className="text-xs h-7 text-status-in-progress" onClick={() => sendAlert(slot.id, slot.customer_id)}>
                                Alert
                              </Button>
                            )}
                            {!['completed', 'cancelled'].includes(slot.status) && (
                              <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => updateSlotStatus(slot.id, 'cancelled', slot.customer_id)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OwnerDashboard;
