-- Supabase SQL Editor'de çalıştırın
-- Mevcut calculations tablosuna müvekkil adı ekler

ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';

SELECT 'client_name kolonu eklendi!' AS durum;
