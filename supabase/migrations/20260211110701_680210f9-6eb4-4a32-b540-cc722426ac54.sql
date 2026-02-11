
-- Update auto_enter_contest to handle:
-- 1. Point subtraction (admin removes points → subtract from contest)
-- 2. Ignore points before contest start (already handled by time check)
-- 3. Ignore points after contest end (already handled by time check)
-- 4. Only use NEW.created_at if it falls within contest window (prevents old timestamp edits)

CREATE OR REPLACE FUNCTION public.auto_enter_contest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contest RECORD;
  existing_entry uuid;
  effective_time timestamptz;
BEGIN
  -- Use the earning_history created_at timestamp to determine timing
  effective_time := COALESCE(NEW.created_at, now());

  -- Find all active contests where the earning timestamp is within the contest window
  FOR contest IN
    SELECT id, allow_same_ip, excluded_users, start_date, end_date
    FROM public.contests
    WHERE status = 'active'
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND effective_time >= start_date
      AND effective_time <= end_date
  LOOP
    -- Skip if user is in excluded list
    IF NEW.user_id = ANY(COALESCE(contest.excluded_users, '{}')) THEN
      CONTINUE;
    END IF;

    -- Check if entry already exists
    SELECT id INTO existing_entry
    FROM public.contest_entries
    WHERE contest_id = contest.id AND user_id = NEW.user_id;

    IF existing_entry IS NOT NULL THEN
      -- Update existing entry: add (or subtract) points
      UPDATE public.contest_entries
      SET points = COALESCE(points, 0) + COALESCE(NEW.amount, 0)
      WHERE id = existing_entry;
    ELSE
      -- Only create new entry if points are positive
      IF COALESCE(NEW.amount, 0) > 0 THEN
        INSERT INTO public.contest_entries (contest_id, user_id, points)
        VALUES (contest.id, NEW.user_id, COALESCE(NEW.amount, 0));
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
