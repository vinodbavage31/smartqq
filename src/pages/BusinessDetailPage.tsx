import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { MapPin, Clock, Users, CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id, selectedDate]);

  const fetchData = async () => {
    const { data: biz } = await supabase.from('businesses').select('*').eq('id', id).single();
    setBusiness(biz);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data: slotData } = await supabase
      .from('queue_slots')
      .select('id, position, status, slot_date')
      .eq('business_id', id!)
      .eq('slot_date', dateStr)
      .order('position', { ascending: true });
    setSlots(slotData || []);
    setLoading(false);
  };

  const handleJoinQueue = async () => {
    if (!user || !business) return;
    setBooking(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Get max position
    const { data: maxSlot } = await supabase
      .from('queue_slots')
      .select('position')
      .eq('business_id', business.id)
      .eq('slot_date', dateStr)
      .order('position', { ascending: false })
      .limit(1);

    const nextPos = (maxSlot && maxSlot.length > 0 ? maxSlot[0].position : 0) + 1;

    const { error } = await supabase.from('queue_slots').insert({
      business_id: business.id,
      customer_id: user.id,
      slot_date: dateStr,
      position: nextPos,
      service_requested: service || null,
    });

    if (error) {
      toast.error('Failed to join queue: ' + error.message);
    } else {
      toast.success(`You're #${nextPos} in the queue!`);
      setService('');
      fetchData();
    }
    setBooking(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6"><CardSkeleton /></main>
    </div>
  );

  if (!business) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-xl font-semibold">Business not found</h2>
      </main>
    </div>
  );

  const activeSlots = slots.filter(s => !['completed', 'cancelled'].includes(s.status));
  const waitMin = activeSlots.length * business.avg_slot_duration_minutes;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h1 className="font-display text-2xl font-bold">{business.name}</h1>
            <Badge variant={business.is_open ? 'default' : 'secondary'} className={cn(business.is_open ? 'bg-status-completed' : '')}>
              {business.is_open ? 'Open' : 'Closed'}
            </Badge>
          </div>
          <Badge variant="outline" className="mb-2">{business.category}</Badge>
          {business.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {business.address}{business.city ? `, ${business.city}` : ''}
            </p>
          )}
          {business.description && (
            <p className="text-sm text-muted-foreground mt-2">{business.description}</p>
          )}
        </div>

        {/* Queue Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold font-display">{activeSlots.length}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold font-display">{waitMin} min</p>
                <p className="text-xs text-muted-foreground">Est. Wait</p>
              </div>
            </div>

            {/* Date picker */}
            <div className="mb-4">
              <Label className="text-sm mb-1 block">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date > addDays(new Date(), 7)}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Slot list */}
            <div className="space-y-2 mb-4">
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No slots booked for this date yet. Be the first!</p>
              ) : (
                slots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium">Position #{slot.position}</span>
                    <StatusBadge status={slot.status} />
                  </div>
                ))
              )}
            </div>

            {/* Join Queue */}
            {business.is_open && user && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label htmlFor="service">Service Requested (optional)</Label>
                  <Input id="service" placeholder="e.g. Haircut, Consultation..." value={service} onChange={e => setService(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleJoinQueue} disabled={booking}>
                  {booking ? 'Joining...' : 'Join Queue'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BusinessDetailPage;
