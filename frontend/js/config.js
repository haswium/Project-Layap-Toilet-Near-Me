// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase credentials

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Surabaya coordinates
const SURABAYA_COORDS = [-7.2575, 112.7521];
const SURABAYA_BOUNDS = [
  [-7.35, 112.60], // Southwest corner
  [-7.15, 112.85]  // Northeast corner
];

// Admin credentials (for demo purposes)
const ADMIN_EMAIL = 'admin1@gmail.com';
const ADMIN_PASSWORD = 'adminada4';