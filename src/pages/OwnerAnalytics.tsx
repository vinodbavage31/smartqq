import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

const OwnerAnalytics = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [totalServed, setTotalServed] = useState(0);
  const [busiestDay, setBusiestDay] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!biz) { setLoading(false); return; }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(weekStart, i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') };
    });

    const { data: slots } = await supabase
      .from('queue_slots')
      .select('slot_date, status')
      .eq('business_id', biz.id)
      .gte('slot_date', days[0].date)
      .lte('slot_date', days[6].date)
      .eq('status', 'completed');

    const counts: Record<string, number> = {};
    (slots || []).forEach((s: any) => {
      counts[s.slot_date] = (counts[s.slot_date] || 0) + 1;
    });

    const chartData = days.map(d => ({ day: d.label, count: counts[d.date] || 0 }));
    setWeeklyData(chartData);
    setTotalServed((slots || []).length);

    const busiest = chartData.reduce((max, d) => d.count > max.count ? d : max, chartData[0]);
    setBusiestDay(busiest.count > 0 ? busiest.day : 'N/A');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold mb-6">Analytics</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-display">{totalServed}</p>
              <p className="text-xs text-muted-foreground">Served This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-display">{busiestDay}</p>
              <p className="text-xs text-muted-foreground">Busiest Day</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Queue Length by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(213, 72%, 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OwnerAnalytics;
