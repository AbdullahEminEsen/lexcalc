-- Lemonsqueezy entegrasyonu için subscriptions tablosuna kolon ekle
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS lemon_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- current_period_end NULL iken active olan kayıtlar için düzeltme
-- (manuel test için)
UPDATE subscriptions 
SET current_period_end = NOW() + INTERVAL '1 year'
WHERE status = 'active' AND current_period_end IS NULL;
