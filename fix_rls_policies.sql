-- Fix RLS policies for inbox_messages table to allow users to send messages to admin

-- First, remove any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.inbox_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.inbox_messages;

-- Create new policies that allow users to send messages to admin

-- Policy 1: Allow users to insert messages (send to admin)
CREATE POLICY "Users can send messages to admin" ON public.inbox_messages
    FOR INSERT
    WITH CHECK (
        from_name = 'User' AND 
        auth.uid()::text = user_id::text
    );

-- Policy 2: Allow users to view their own messages
CREATE POLICY "Users can view their own messages" ON public.inbox_messages
    FOR SELECT
    USING (
        auth.uid()::text = user_id::text OR 
        from_name = 'Admin'
    );

-- Policy 3: Allow users to update their own messages
CREATE POLICY "Users can update their own messages" ON public.inbox_messages
    FOR UPDATE
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Policy 4: Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.inbox_messages
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Policy 5: Allow admin to do everything
CREATE POLICY "Admin full access to inbox_messages" ON public.inbox_messages
    FOR ALL
    USING (
        -- Admin can see all messages
        true
    )
    WITH CHECK (
        -- Admin can insert any message
        true
    );

-- Grant necessary permissions
GRANT ALL ON public.inbox_messages TO authenticated;
GRANT SELECT ON public.inbox_messages TO anon;
