-- Simple RLS fix for inbox_messages table
-- This allows users to send messages to admin

-- First, enable RLS if not already enabled
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can send messages to admin" ON public.inbox_messages;
DROP POLICY IF EXISTS "Admin full access to inbox_messages" ON public.inbox_messages;

-- Create simple, permissive policies

-- Policy 1: Allow users to insert messages (send to admin)
CREATE POLICY "Allow users to send messages" ON public.inbox_messages
    FOR INSERT
    WITH CHECK (
        from_name = 'User' AND 
        auth.uid()::text = user_id::text
    );

-- Policy 2: Allow users to view messages they sent OR messages from admin
CREATE POLICY "Allow users to view messages" ON public.inbox_messages
    FOR SELECT
    USING (
        (auth.uid()::text = user_id::text AND from_name = 'User') OR 
        from_name = 'Admin'
    );

-- Policy 3: Allow users to update their own messages
CREATE POLICY "Allow users to update their messages" ON public.inbox_messages
    FOR UPDATE
    USING (auth.uid()::text = user_id::text AND from_name = 'User');

-- Policy 4: Allow users to delete their own messages
CREATE POLICY "Allow users to delete their messages" ON public.inbox_messages
    FOR DELETE
    USING (auth.uid()::text = user_id::text AND from_name = 'User');

-- Policy 5: Allow admin to do everything (bypass RLS)
CREATE POLICY "Allow admin full access" ON public.inbox_messages
    FOR ALL
    USING (
        -- Admin can see and do everything
        true
    )
    WITH CHECK (
        -- Admin can insert any message
        true
    );

-- Make sure RLS is properly configured
ALTER TABLE public.inbox_messages FORCE ROW LEVEL SECURITY;
