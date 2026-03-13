import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Clock, Users, Zap, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (profile) {
    return null; // redirect handled in App.tsx
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">SQ</span>
            </div>
            <span className="font-display font-bold text-lg">SmartQ</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link to="/login">Log In</Link></Button>
            <Button asChild><Link to="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Never Wait in Line<br />
            <span className="text-primary">Again.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            SmartQ lets you find nearby service providers, see real-time queue status, and book your slot — all from your phone. No more standing in line.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">I Have an Account</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-card border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Discover</h3>
              <p className="text-sm text-muted-foreground">Find barbers, clinics, salons, restaurants near you with real-time availability.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Book Instantly</h3>
              <p className="text-sm text-muted-foreground">Join the queue remotely. See your estimated wait time and position live.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Get Notified</h3>
              <p className="text-sm text-muted-foreground">Receive alerts when it's almost your turn. Show up just in time.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 SmartQ. Smart Queue Management.
      </footer>
    </div>
  );
};

// Need to import Search for the features section
import { Search } from 'lucide-react';

export default LandingPage;
