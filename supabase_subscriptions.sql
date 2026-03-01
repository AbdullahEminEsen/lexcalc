-- Supabase SQL Editor'de çalıştırın

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  -- status: 'trial' | 'active' | 'expired' | 'cancelled'
  plan TEXT DEFAULT 'monthly',
  -- plan: 'monthly' | 'yearly'
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  iyzico_subscription_ref TEXT,
  iyzico_customer_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sub_insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub_update" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Yeni kullanıcı kaydında otomatik trial oluştur
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (NEW.id, 'trial', NOW() + INTERVAL '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles tablosuna trigger (zaten profiles trigger varsa bu tetikler)
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();

-- Mevcut kullanıcılara trial ekle (daha önce kayıt olanlar için)
INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
SELECT id, 'trial', NOW() + INTERVAL '7 days'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Subscriptions tablosu oluşturuldu!' AS durum;
