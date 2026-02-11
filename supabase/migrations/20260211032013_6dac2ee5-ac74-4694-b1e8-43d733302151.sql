
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_subadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'subadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'India',
  payment_method TEXT,
  payment_info TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  is_verified BOOLEAN DEFAULT FALSE,
  cash_balance DECIMAL(10,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  locked_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID,
  free_messages_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own or admin reads all" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_subadmin());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or admin updates all" ON public.profiles FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes profiles" ON public.profiles FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Survey Providers
CREATE TABLE public.survey_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  point_percentage DECIMAL(5,2) DEFAULT 100,
  is_recommended BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2,1) DEFAULT 0,
  button_text TEXT DEFAULT 'Open Survey',
  color_code TEXT,
  button_gradient TEXT,
  content TEXT,
  image_url TEXT,
  level INTEGER DEFAULT 1,
  iframe_code TEXT,
  iframe_keys TEXT,
  postback_url TEXT,
  postback_username_key TEXT,
  postback_status_key TEXT,
  postback_payout_key TEXT,
  postback_txn_key TEXT,
  different_postback_link TEXT,
  payout_type TEXT DEFAULT 'points',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.survey_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read survey providers" ON public.survey_providers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages survey providers" ON public.survey_providers FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates survey providers" ON public.survey_providers FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes survey providers" ON public.survey_providers FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_survey_providers_updated_at BEFORE UPDATE ON public.survey_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Single Link Providers
CREATE TABLE public.single_link_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  point_percentage DECIMAL(5,2) DEFAULT 100,
  different_postback BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  link_keys TEXT,
  postback_url TEXT,
  postback_username_key TEXT,
  postback_status_key TEXT,
  postback_payout_key TEXT,
  postback_txn_key TEXT,
  success_value TEXT,
  fail_value TEXT,
  payout_type TEXT DEFAULT 'points',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.single_link_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read single link providers" ON public.single_link_providers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages single link providers" ON public.single_link_providers FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates single link providers" ON public.single_link_providers FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes single link providers" ON public.single_link_providers FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_single_link_providers_updated_at BEFORE UPDATE ON public.single_link_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Survey Links
CREATE TABLE public.survey_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payout INTEGER DEFAULT 0,
  link TEXT,
  link_offer_id TEXT,
  survey_provider_id UUID REFERENCES public.survey_providers(id) ON DELETE SET NULL,
  country TEXT,
  is_recommended BOOLEAN DEFAULT FALSE,
  button_text TEXT DEFAULT 'Start Survey',
  color_code TEXT,
  button_gradient TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  image_url TEXT,
  content TEXT,
  level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.survey_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read survey links" ON public.survey_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages survey links" ON public.survey_links FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates survey links" ON public.survey_links FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes survey links" ON public.survey_links FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_survey_links_updated_at BEFORE UPDATE ON public.survey_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Earning History
CREATE TABLE public.earning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  type TEXT DEFAULT 'points',
  offer_name TEXT,
  bonus_percentage DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.earning_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own earnings" ON public.earning_history FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = earning_history.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Admin inserts earnings" ON public.earning_history FOR INSERT WITH CHECK (public.is_admin_or_subadmin() OR auth.uid() = (SELECT user_id FROM public.profiles WHERE id = earning_history.user_id));
CREATE POLICY "Admin updates earnings" ON public.earning_history FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes earnings" ON public.earning_history FOR DELETE USING (public.is_admin());

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  payment_method TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  txn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = withdrawals.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Users create own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = withdrawals.user_id));
CREATE POLICY "Admin updates withdrawals" ON public.withdrawals FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes withdrawals" ON public.withdrawals FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contests
CREATE TABLE public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  description TEXT,
  excluded_users UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read contests" ON public.contests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages contests" ON public.contests FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates contests" ON public.contests FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes contests" ON public.contests FOR DELETE USING (public.is_admin());

-- Contest Entries
CREATE TABLE public.contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, user_id)
);
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read contest entries" ON public.contest_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users create own entries" ON public.contest_entries FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = contest_entries.user_id));
CREATE POLICY "Admin manages contest entries" ON public.contest_entries FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes contest entries" ON public.contest_entries FOR DELETE USING (public.is_admin());

-- News
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read news" ON public.news FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages news" ON public.news FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates news" ON public.news FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes news" ON public.news FOR DELETE USING (public.is_admin());

-- Promocodes
CREATE TABLE public.promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  reward INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read promocodes" ON public.promocodes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages promocodes" ON public.promocodes FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Admin updates promocodes" ON public.promocodes FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes promocodes" ON public.promocodes FOR DELETE USING (public.is_admin());

-- Promocode Redemptions
CREATE TABLE public.promocode_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  promocode_id UUID REFERENCES public.promocodes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promocode_id)
);
ALTER TABLE public.promocode_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions" ON public.promocode_redemptions FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = promocode_redemptions.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Users create own redemptions" ON public.promocode_redemptions FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = promocode_redemptions.user_id));

-- Support Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = support_tickets.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Users create own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = support_tickets.user_id));
CREATE POLICY "Admin updates tickets" ON public.support_tickets FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes tickets" ON public.support_tickets FOR DELETE USING (public.is_admin());
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inbox Messages
CREATE TABLE public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_name TEXT,
  subject TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own inbox" ON public.inbox_messages FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = inbox_messages.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Admin sends messages" ON public.inbox_messages FOR INSERT WITH CHECK (public.is_admin_or_subadmin());
CREATE POLICY "Users update read status" ON public.inbox_messages FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = inbox_messages.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes messages" ON public.inbox_messages FOR DELETE USING (public.is_admin());

-- Notifications / Activity Feed
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own or global notifications" ON public.notifications FOR SELECT USING (is_global = TRUE OR auth.uid() = (SELECT user_id FROM public.profiles WHERE id = notifications.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages notifications" ON public.notifications FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes notifications" ON public.notifications FOR DELETE USING (public.is_admin());

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read chat" ON public.chat_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users send chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages chat" ON public.chat_messages FOR UPDATE USING (public.is_admin_or_subadmin());
CREATE POLICY "Admin deletes chat" ON public.chat_messages FOR DELETE USING (public.is_admin());

-- Payment Methods (global config)
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  fee_percentage DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages payment methods" ON public.payment_methods FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin updates payment methods" ON public.payment_methods FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin deletes payment methods" ON public.payment_methods FOR DELETE USING (public.is_admin());

-- Site Pages
CREATE TABLE public.site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'active'
);
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active pages" ON public.site_pages FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages pages" ON public.site_pages FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin updates pages" ON public.site_pages FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin deletes pages" ON public.site_pages FOR DELETE USING (public.is_admin());

-- Website Settings
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT
);
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads settings" ON public.website_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin manages settings" ON public.website_settings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin updates settings" ON public.website_settings FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin deletes settings" ON public.website_settings FOR DELETE USING (public.is_admin());

-- Login Logs
CREATE TABLE public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own logs" ON public.login_logs FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = login_logs.user_id) OR public.is_admin_or_subadmin());
CREATE POLICY "System inserts logs" ON public.login_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deletes logs" ON public.login_logs FOR DELETE USING (public.is_admin());

-- Sub Admins
CREATE TABLE public.sub_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"survey_providers": true, "single_link_providers": true, "survey_links": true, "contests": true, "earning_history": true, "withdrawals": true, "users": true, "news": true, "promocodes": true, "support_tickets": true, "notifications": true}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sub_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads sub admins" ON public.sub_admins FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin manages sub admins" ON public.sub_admins FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin updates sub admins" ON public.sub_admins FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin deletes sub admins" ON public.sub_admins FOR DELETE USING (public.is_admin());
