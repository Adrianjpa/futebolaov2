-- Create MESSAGES table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means "To Admins" / Support
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- 1. Users can see their own messages (sent or received)
CREATE POLICY "Users can see own messages" ON messages
FOR SELECT USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- 2. Admins can see ALL messages (Support mode)
CREATE POLICY "Admins can see all messages" ON messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND funcao IN ('admin', 'moderator'))
);

-- 3. Users can insert messages (sender must be themselves)
CREATE POLICY "Users can insert messages" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- 4. Admins can update messages (e.g. mark as read)
CREATE POLICY "Admins can update messages" ON messages
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND funcao IN ('admin', 'moderator'))
);

-- 5. Users can update messages (mark as read if they are receiver)
CREATE POLICY "Users can mark as read" ON messages
FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- Enable Realtime
alter publication supabase_realtime add table messages;
