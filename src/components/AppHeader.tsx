import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, LayoutDashboard, Store, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  business_name: string | null;
  created_at: string;
}

export const AppHeader = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount((data as Notification[]).filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications-' + profile.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const isOwner = profile?.role === 'owner';

  return (
    <header className={`sticky top-0 z-50 border-b ${isOwner ? 'bg-owner-nav text-owner-nav-foreground' : 'bg-card'}`}>
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to={isOwner ? '/owner' : '/discover'} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">SQ</span>
          </div>
          <span className="font-display font-bold text-lg">SmartQ</span>
        </Link>

        <nav className="flex items-center gap-1">
          {!isOwner && (
            <>
              <Button variant="ghost" size="sm" asChild className={isOwner ? 'text-owner-nav-foreground hover:bg-primary/20' : ''}>
                <Link to="/discover"><Search className="h-4 w-4 mr-1" /> Discover</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className={isOwner ? 'text-owner-nav-foreground hover:bg-primary/20' : ''}>
                <Link to="/my-queue"><LayoutDashboard className="h-4 w-4 mr-1" /> My Queue</Link>
              </Button>
            </>
          )}
          {isOwner && (
            <>
              <Button variant="ghost" size="sm" asChild className="text-owner-nav-foreground hover:bg-primary/20">
                <Link to="/owner"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-owner-nav-foreground hover:bg-primary/20">
                <Link to="/owner/setup"><Store className="h-4 w-4 mr-1" /> My Business</Link>
              </Button>
            </>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`relative ${isOwner ? 'text-owner-nav-foreground hover:bg-primary/20' : ''}`}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="font-display font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-auto py-1">
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No notifications yet</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/'); }} className={isOwner ? 'text-owner-nav-foreground hover:bg-primary/20' : ''}>
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
};
