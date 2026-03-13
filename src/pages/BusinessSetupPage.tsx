import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const categories = ['Barber', 'Clinic', 'Restaurant', 'Salon', 'Government', 'Event', 'Other'];

const BusinessSetupPage = () => {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Barber');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [avgDuration, setAvgDuration] = useState(15);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBusiness();
  }, [user]);

  const fetchBusiness = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (data) {
      setBusiness(data);
      setName(data.name);
      setCategory(data.category);
      setAddress(data.address || '');
      setCity(data.city || '');
      setDescription(data.description || '');
      setAvgDuration(data.avg_slot_duration_minutes);
      setIsOpen(data.is_open);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      owner_id: user.id,
      name,
      category,
      address: address || null,
      city: city || null,
      description: description || null,
      avg_slot_duration_minutes: avgDuration,
      is_open: isOpen,
    };

    if (business) {
      const { error } = await supabase.from('businesses').update(payload).eq('id', business.id);
      if (error) toast.error(error.message);
      else toast.success('Business updated!');
    } else {
      const { error } = await supabase.from('businesses').insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success('Business created!');
        fetchBusiness();
      }
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <h1 className="font-display text-2xl font-bold mb-6">
          {business ? 'Edit Business' : 'Set Up Your Business'}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Business Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">Business Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label htmlFor="duration">Avg. Slot Duration (minutes)</Label>
                <Input id="duration" type="number" min={1} value={avgDuration} onChange={e => setAvgDuration(Number(e.target.value))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Queue is Open</Label>
                <Switch checked={isOpen} onCheckedChange={setIsOpen} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving...' : business ? 'Update Business' : 'Create Business'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BusinessSetupPage;
