
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable for queue display" ON public.profiles FOR SELECT USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  address TEXT,
  city TEXT,
  description TEXT,
  avg_slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Owners can insert their business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their business" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their business" ON public.businesses FOR DELETE USING (auth.uid() = owner_id);

-- Create queue_slots table
CREATE TABLE public.queue_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  service_requested TEXT,
  booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes_to_customer TEXT,
  alert_sent BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.queue_slots ENABLE ROW LEVEL SECURITY;

-- Customers can see their own slots
CREATE POLICY "Customers can view their own slots" ON public.queue_slots FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert their own slots" ON public.queue_slots FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update their own slots" ON public.queue_slots FOR UPDATE USING (auth.uid() = customer_id);

-- Owners can view/manage slots for their businesses
CREATE POLICY "Owners can view slots for their business" ON public.queue_slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = queue_slots.business_id AND businesses.owner_id = auth.uid())
);
CREATE POLICY "Owners can update slots for their business" ON public.queue_slots FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = queue_slots.business_id AND businesses.owner_id = auth.uid())
);

-- Anyone can view slot counts for businesses (for queue display) - limited info
CREATE POLICY "Anyone can view slot counts" ON public.queue_slots FOR SELECT USING (true);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  business_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Enable realtime for queue_slots and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
