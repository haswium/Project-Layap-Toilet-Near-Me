-- Toilet Near Me - Database Setup
-- Run this in your Supabase SQL Editor

-- ==================== TABLES ====================

-- Profiles table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Toilets table
CREATE TABLE toilets (
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

-- Toilet images table
CREATE TABLE toilet_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toilet_id UUID REFERENCES toilets(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
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

-- Report images table
CREATE TABLE report_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_toilets_status ON toilets(status);
CREATE INDEX idx_toilets_location ON toilets(latitude, longitude);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_toilet_images_toilet_id ON toilet_images(toilet_id);
CREATE INDEX idx_report_images_report_id ON report_images(report_id);

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE toilets ENABLE ROW LEVEL SECURITY;
ALTER TABLE toilet_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Toilets policies
CREATE POLICY "Approved toilets are viewable by everyone"
  ON toilets FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can manage all toilets"
  ON toilets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Toilet images policies
CREATE POLICY "Toilet images of approved toilets are viewable by everyone"
  ON toilet_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM toilets
      WHERE toilets.id = toilet_images.toilet_id
      AND toilets.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage all toilet images"
  ON toilet_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Reports policies
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reports"
  ON reports FOR UPDATE
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own pending reports"
  ON reports FOR DELETE
  USING (
    auth.uid() = user_id AND status = 'pending'
  );

CREATE POLICY "Admins can update any report"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Report images policies
CREATE POLICY "Users can view their own report images"
  ON report_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_images.report_id
      AND (reports.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can insert their own report images"
  ON report_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_images.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all report images"
  ON report_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ==================== TRIGGERS ====================

-- Auto-update updated_at trigger for toilets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_toilets_updated_at
  BEFORE UPDATE ON toilets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== INITIAL DATA ====================

-- Create admin user (you'll need to sign up with this email first via the app)
-- After signing up with admin1@gmail.com, run this to make them admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin1@gmail.com';

-- Insert sample toilets (Surabaya area)
INSERT INTO toilets (name, latitude, longitude, address, floor, price_type, price, comfort, description, facilities, status) VALUES
(
  'Toilet Publik Tunjungan Plaza',
  -7.2649, 112.7378,
  'Jl. Basuki Rahmat No.8-12, Embong Kaliasin, Kec. Genteng, Surabaya',
  'Lt. 3',
  'gratis',
  0,
  4,
  'Toilet bersih di dalam mall dengan fasilitas lengkap',
  '["air", "wastafel", "pria", "wanita", "difabel", "ruang_ganti"]'::jsonb,
  'approved'
),
(
  'Toilet Stasiun Surabaya Gubeng',
  -7.2653, 112.7583,
  'Jl. Raya Gubeng, Gubeng, Surabaya',
  'Lantai Dasar',
  'berbayar',
  2000,
  3,
  'Toilet umum di stasiun kereta api utama Surabaya',
  '["air", "wastafel", "pria", "wanita"]'::jsonb,
  'approved'
),
(
  'Toilet Taman Bungkul',
  -7.2889, 112.7378,
  'Jl. Raya Bungkul, Taman Bungkul, Surabaya',
  NULL,
  'gratis',
  0,
  3,
  'Toilet publik gratis di taman kota',
  '["air", "wastafel", "pria", "wanita", "difabel"]'::jsonb,
  'approved'
);

-- Insert sample images for the toilets (placeholder URLs)
INSERT INTO toilet_images (toilet_id, image_url, is_primary)
SELECT 
  id,
  'https://via.placeholder.com/400x300/087F5B/FFFFFF?text=Toilet+Image',
  true
FROM toilets
WHERE name IN ('Toilet Publik Tunjungan Plaza', 'Toilet Stasiun Surabaya Gubeng', 'Toilet Taman Bungkul');

-- ==================== STORAGE BUCKET ====================

-- Create storage bucket for toilet images
-- This needs to be done via Supabase Dashboard or API
-- Bucket name: toilet-images
-- Make it public

-- Storage policies (run after creating the bucket)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('toilet-images', 'toilet-images', true);

-- Allow public read access
-- CREATE POLICY "Public Access"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'toilet-images');

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated Upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'toilet-images' AND
--     auth.role() = 'authenticated'
--   );

-- Allow users to delete their own files
-- CREATE POLICY "User Delete Own"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'toilet-images' AND
--     auth.uid()::text LIKE CONCAT('%', owner_id::text, '%')
--   );