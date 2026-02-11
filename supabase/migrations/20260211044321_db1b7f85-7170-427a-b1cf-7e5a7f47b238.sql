-- Create the missing profile for the existing user and set as admin
INSERT INTO public.profiles (user_id, email, username, role, referral_code, status, is_verified)
VALUES (
  '66898fdb-ec83-46c1-b3de-df0a52b15f14',
  'badboysai922@gmail.com',
  'badboysai',
  'admin',
  upper(substr(md5(random()::text), 1, 10)),
  'active',
  true
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';