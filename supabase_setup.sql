-- ============================================================
-- LexCalc - Supabase Veritabanı Kurulum Scripti
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================================

-- 1. PROFILES TABLOSU (kullanıcı profilleri)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  firm_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CALCULATIONS TABLOSU (kayıtlı hesaplamalar)
CREATE TABLE IF NOT EXISTS public.calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- tapu, damga, kdv, noter, avukatlik, custom
  amount NUMERIC DEFAULT 0,
  result NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  overrides JSONB DEFAULT '{}',
  extras JSONB DEFAULT '[]',
  formula TEXT DEFAULT '', -- özel formül için
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VARIABLES TABLOSU (kayıtlı değişkenler)
CREATE TABLE IF NOT EXISTS public.variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT DEFAULT '%',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (Her kullanıcı sadece kendi verisini görür)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY;

-- PROFILES politikaları
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CALCULATIONS politikaları
CREATE POLICY "calculations_select" ON public.calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "calculations_insert" ON public.calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calculations_update" ON public.calculations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "calculations_delete" ON public.calculations
  FOR DELETE USING (auth.uid() = user_id);

-- VARIABLES politikaları
CREATE POLICY "variables_select" ON public.variables
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "variables_insert" ON public.variables
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "variables_update" ON public.variables
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "variables_delete" ON public.variables
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- OTOMATİK PROFİL OLUŞTURMA (kayıt olunca tetiklenir)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calculations_updated_at
  BEFORE UPDATE ON public.calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_variables_updated_at
  BEFORE UPDATE ON public.variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- TAMAMLANDI
-- ============================================================
SELECT 'LexCalc veritabanı başarıyla kuruldu!' AS durum;
