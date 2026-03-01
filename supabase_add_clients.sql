-- Supabase SQL Editor'de çalıştırın
-- Müvekkil yönetimi tablosu

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- calculations tablosuna client_id bağlantısı ekle
ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

SELECT 'Müvekkil tablosu başarıyla oluşturuldu!' AS durum;
