-- Create user_sent_messages table to store messages sent by users to admin
-- This avoids RLS policy conflicts with inbox_messages table

CREATE TABLE IF NOT EXISTS public.user_sent_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_name TEXT NOT NULL DEFAULT 'User',
    to_name TEXT NOT NULL DEFAULT 'Admin',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sent_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own sent messages
CREATE POLICY "Users can insert their own sent messages" ON public.user_sent_messages
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy to allow users to view their own sent messages
CREATE POLICY "Users can view their own sent messages" ON public.user_sent_messages
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Create policy to allow users to update their own sent messages
CREATE POLICY "Users can update their own sent messages" ON public.user_sent_messages
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Create policy to allow users to delete their own sent messages
CREATE POLICY "Users can delete their own sent messages" ON public.user_sent_messages
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT ALL ON public.user_sent_messages TO authenticated;
GRANT SELECT ON public.user_sent_messages TO anon;
