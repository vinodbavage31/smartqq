import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { Search, MapPin, Clock, Users, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const categories = ['All', 'Barber', 'Clinic', 'Restaurant', 'Salon', 'Government', 'Event', 'Other'];

interface Business {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  description: string | null;
  avg_slot_duration_minutes: number;
  is_open: boolean;
  queue_count?: number;
}

const DiscoverPage = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase.from('businesses').select('*');
    if (data) {
      setBusinesses(data as Business[]);
      // Fetch queue counts
      const today = new Date().toISOString().split('T')[0];
      const { data: slots } = await supabase
        .from('queue_slots')
        .select('business_id')
        .eq('slot_date', today)
        .in('status', ['pending', 'confirmed', 'in_progress']);
      if (slots) {
        const counts: Record<string, number> = {};
        slots.forEach((s: any) => {
          counts[s.business_id] = (counts[s.business_id] || 0) + 1;
        });
        setQueueCounts(counts);
      }
    }
    setLoading(false);
  };

  const filtered = businesses.filter(b => {
    const matchesSearch = !search || 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || b.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-4">Discover Services</h1>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-lg">No businesses found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(biz => {
              const count = queueCounts[biz.id] || 0;
              const waitMin = count * biz.avg_slot_duration_minutes;
              return (
                <Card
                  key={biz.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/business/${biz.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display font-semibold text-lg leading-tight">{biz.name}</h3>
                      <Badge variant={biz.is_open ? 'default' : 'secondary'} className={cn('text-xs', biz.is_open ? 'bg-status-completed' : '')}>
                        {biz.is_open ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="mb-2 text-xs">{biz.category}</Badge>
                    {biz.city && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="h-3 w-3" /> {biz.city}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {count} in queue</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{waitMin} min wait</span>
                    </div>
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

export default DiscoverPage;
