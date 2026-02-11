
-- Function: Auto-enter user into active contests when they earn points
CREATE OR REPLACE FUNCTION public.auto_enter_contest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contest RECORD;
  existing_entry uuid;
BEGIN
  -- Find all active contests where current time is within the contest window
  FOR contest IN
    SELECT id, allow_same_ip, excluded_users
    FROM public.contests
    WHERE status = 'active'
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND now() >= start_date
      AND now() <= end_date
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
      -- Update existing entry: add points
      UPDATE public.contest_entries
      SET points = COALESCE(points, 0) + COALESCE(NEW.amount, 0)
      WHERE id = existing_entry;
    ELSE
      -- Create new entry
      INSERT INTO public.contest_entries (contest_id, user_id, points)
      VALUES (contest.id, NEW.user_id, COALESCE(NEW.amount, 0));
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on earning_history insert
DROP TRIGGER IF EXISTS trg_auto_enter_contest ON public.earning_history;
CREATE TRIGGER trg_auto_enter_contest
AFTER INSERT ON public.earning_history
FOR EACH ROW
EXECUTE FUNCTION public.auto_enter_contest();

-- Function: Finalize ended contests, credit rewards, post notifications
CREATE OR REPLACE FUNCTION public.finalize_ended_contests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contest RECORD;
  entry RECORD;
  reward RECORD;
  rank_num integer;
  prize_amount integer;
BEGIN
  -- Find active contests that have ended
  FOR contest IN
    SELECT *
    FROM public.contests
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND now() > end_date
  LOOP
    -- Lock the contest
    UPDATE public.contests SET status = 'ended' WHERE id = contest.id;

    -- Get ranked entries and credit rewards
    rank_num := 0;
    FOR entry IN
      SELECT ce.*, p.username
      FROM public.contest_entries ce
      LEFT JOIN public.profiles p ON p.id = ce.user_id
      WHERE ce.contest_id = contest.id
      ORDER BY ce.points DESC, ce.created_at ASC
    LOOP
      rank_num := rank_num + 1;
      
      -- Check if this rank has a reward
      prize_amount := 0;
      SELECT (r->>'prize')::integer INTO prize_amount
      FROM jsonb_array_elements(COALESCE(contest.rewards, '[]'::jsonb)) r
      WHERE (r->>'rank')::integer = rank_num
      LIMIT 1;

      IF prize_amount > 0 THEN
        -- Credit bonus points to winner
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + prize_amount
        WHERE id = entry.user_id;

        -- Record in earning history
        INSERT INTO public.earning_history (user_id, amount, type, description, offer_name, status)
        VALUES (entry.user_id, prize_amount, 'points',
          'Contest "' || contest.title || '" Rank #' || rank_num || ' reward',
          contest.title, 'approved');

        -- Post notification for winner
        INSERT INTO public.notifications (type, message, is_global)
        VALUES ('contest_winner',
          '🏆 ' || COALESCE(entry.username, 'User') || ' won Rank #' || rank_num || ' in "' || contest.title || '" and earned ' || prize_amount || ' bonus points!',
          true);
      END IF;
    END LOOP;

    -- Post contest ended notification
    INSERT INTO public.notifications (type, message, is_global)
    VALUES ('contest_ended',
      '🏁 Contest "' || contest.title || '" has ended! ' || rank_num || ' participants competed.',
      true);
  END LOOP;
END;
$$;
