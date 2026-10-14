-- =====================================================================
-- TOILET NEAR ME - FINAL DATABASE SETUP
-- =====================================================================

-- ==================== TABLES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS toilets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('gratis', 'berbayar')),
  price INTEGER DEFAULT 0,
  comfort INTEGER NOT NULL CHECK (comfort >= 1 AND comfort <= 5),
  description TEXT,
  facilities JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS toilet_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toilet_id UUID REFERENCES toilets(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('gratis', 'berbayar')),
  price INTEGER DEFAULT 0,
  comfort INTEGER NOT NULL CHECK (comfort >= 1 AND comfort <= 5),
  description TEXT,
  facilities JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS report_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_toilets_status ON toilets(status);
CREATE INDEX IF NOT EXISTS idx_toilets_location ON toilets(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_toilet_images_toilet_id ON toilet_images(toilet_id);
CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id);

-- ==================== ROW LEVEL SECURITY (RLS) ====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE toilets ENABLE ROW LEVEL SECURITY;
ALTER TABLE toilet_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true); -- Aman untuk trigger & registrado
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Toilets policies
DROP POLICY IF EXISTS "toilets_select" ON toilets;
DROP POLICY IF EXISTS "toilets_all_admin" ON toilets;

CREATE POLICY "toilets_select" ON toilets FOR SELECT USING (status = 'approved');
CREATE POLICY "toilets_all_admin" ON toilets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Toilet images policies
DROP POLICY IF EXISTS "toilet_images_select" ON toilet_images;

CREATE POLICY "toilet_images_select" ON toilet_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM toilets WHERE toilets.id = toilet_images.toilet_id AND toilets.status = 'approved')
);

-- Reports policies
DROP POLICY IF EXISTS "reports_select" ON reports;
DROP POLICY IF EXISTS "reports_insert" ON reports;
DROP POLICY IF EXISTS "reports_update" ON reports;
DROP POLICY IF EXISTS "reports_delete" ON reports;

CREATE POLICY "reports_select" ON reports FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (
  (auth.uid() = user_id AND status = 'pending') OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "reports_delete" ON reports FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Report images policies
DROP POLICY IF EXISTS "report_images_select" ON report_images;
DROP POLICY IF EXISTS "report_images_insert" ON report_images;

CREATE POLICY "report_images_select" ON report_images FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM reports WHERE reports.id = report_images.report_id AND (
      reports.user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
  )
);
CREATE POLICY "report_images_insert" ON report_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reports WHERE reports.id = report_images.report_id AND reports.user_id = auth.uid())
);

-- ==================== TRIGGERS ====================
-- 1. TRIGGER AUTO-CREATE PROFILE (PENTING)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-update updated_at trigger for toilets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_toilets_updated_at ON toilets;
CREATE TRIGGER update_toilets_updated_at
  BEFORE UPDATE ON toilets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== INITIAL DATA ====================
INSERT INTO toilets (name, latitude, longitude, address, floor, price_type, price, comfort, description, facilities, status) 
VALUES
('Toilet Publik Tunjungan Plaza', -7.2649, 112.7378, 'Jl. Basuki Rahmat No.8-12, Embong Kaliasin, Kec. Genteng, Surabaya', 'Lt. 3', 'gratis', 0, 4, 'Toilet bersih di dalam mall dengan fasilitas lengkap', '["air", "wastafel", "pria", "wanita", "difabel", "ruang_ganti"]'::jsonb, 'approved'),
('Toilet Stasiun Surabaya Gubeng', -7.2653, 112.7583, 'Jl. Raya Gubeng, Gubeng, Surabaya', 'Lantai Dasar', 'berbayar', 2000, 3, 'Toilet umum di stasiun kereta api utama Surabaya', '["air", "wastafel", "pria", "wanita"]'::jsonb, 'approved'),
('Toilet Taman Bungkul', -7.2889, 112.7378, 'Jl. Raya Bungkul, Taman Bungkul, Surabaya', NULL, 'gratis', 0, 3, 'Toilet publik gratis di taman kota', '["air", "wastafel", "pria", "wanita", "difabel"]'::jsonb, 'approved')
ON CONFLICT DO NOTHING;

INSERT INTO toilet_images (toilet_id, image_url, is_primary)
SELECT id, 'https://via.placeholder.com/400x300/087F5B/FFFFFF?text=Toilet+Image', true
FROM toilets WHERE name IN ('Toilet Publik Tunjungan Plaza', 'Toilet Stasiun Surabaya Gubeng', 'Toilet Taman Bungkul')
ON CONFLICT DO NOTHING;

-- Setup admin manual (jika belum ada)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin' FROM auth.users WHERE email = 'admin1@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ==================== STORAGE BUCKET INFO ====================
-- Bucket name: toilet-photos (Bukan toilet-images!)
-- Make it public via Dashboard