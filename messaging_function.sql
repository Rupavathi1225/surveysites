-- Create a database function to bypass RLS for user messaging
-- This allows users to send messages to admin without RLS restrictions

CREATE OR REPLACE FUNCTION public.send_message_to_admin(
    p_user_id UUID,
    p_subject TEXT,
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
DECLARE
    message_id UUID;
BEGIN
    -- Insert message directly into inbox_messages table
    INSERT INTO public.inbox_messages (
        user_id,
        from_name,
        subject,
        message,
        is_read,
        created_at
    ) VALUES (
        p_user_id,
        'User',
        p_subject,
        p_message,
        false,
        NOW()
    )
    RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_message_to_admin TO authenticated;
