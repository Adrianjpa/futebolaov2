-- FIX: RLS Policies for Championships & Notifications

-- 1. Championships
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read championships
DROP POLICY IF EXISTS "Championships are viewable by everyone" ON public.championships;
CREATE POLICY "Championships are viewable by everyone" 
ON public.championships FOR SELECT 
USING (true);

-- Allow Admins to manage championships (Insert, Update, Delete)
DROP POLICY IF EXISTS "Admins can manage championships" ON public.championships;
CREATE POLICY "Admins can manage championships" 
ON public.championships FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND funcao = 'admin')
);

-- 2. Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update (mark as read) their own notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow Admins to insert notifications for anyone (System notifications)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND funcao = 'admin')
);
