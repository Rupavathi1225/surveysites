
CREATE TABLE public.qualification_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.qualification_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualification_questions TO authenticated;
GRANT ALL ON public.qualification_questions TO service_role;

ALTER TABLE public.qualification_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled qualification questions"
  ON public.qualification_questions FOR SELECT
  USING (is_enabled = true OR public.is_admin_or_subadmin());

CREATE POLICY "Admins can insert qualification questions"
  ON public.qualification_questions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_subadmin());

CREATE POLICY "Admins can update qualification questions"
  ON public.qualification_questions FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_subadmin());

CREATE POLICY "Admins can delete qualification questions"
  ON public.qualification_questions FOR DELETE
  TO authenticated
  USING (public.is_admin_or_subadmin());

CREATE TRIGGER update_qualification_questions_updated_at
  BEFORE UPDATE ON public.qualification_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.qualification_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualification_responses TO authenticated;
GRANT ALL ON public.qualification_responses TO service_role;

ALTER TABLE public.qualification_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own qualification response"
  ON public.qualification_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_subadmin());

CREATE POLICY "Users can insert their own qualification response"
  ON public.qualification_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qualification response"
  ON public.qualification_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_qualification_responses_updated_at
  BEFORE UPDATE ON public.qualification_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.qualification_questions (question_text, options, sort_order, is_enabled) VALUES
('What is your age range?', '["18-24","25-34","35-44","45-54","55+"]'::jsonb, 1, true),
('What is your gender?', '["Male","Female","Other","Prefer not to say"]'::jsonb, 2, true),
('What is your employment status?', '["Employed full-time","Employed part-time","Self-employed","Student","Unemployed","Retired"]'::jsonb, 3, true),
('What is your highest level of education?', '["High school","Some college","Bachelor''s degree","Master''s degree","Doctorate"]'::jsonb, 4, true),
('How did you hear about us?', '["Social media","Friend or family","Search engine","Advertisement","Other"]'::jsonb, 5, true);
