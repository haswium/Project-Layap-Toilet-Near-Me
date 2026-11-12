// Supabase Configuration
const SUPABASE_URL = 'https://bnaknepmqiyomnhyvkyt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xjTqFbpkzuv1nm9dFGkzRw_mx-rEpkG';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Surabaya coordinates & Bounds
const SURABAYA_COORDS = [-7.2575, 112.7521];
const SURABAYA_BOUNDS = [
  [-7.35, 112.60], // Southwest corner
  [-7.15, 112.85]  // Northeast corner
];

// ITS Home Bounds (ketat - untuk browse map)
const ITS_HOME_BOUNDS = L.latLngBounds(
  [-7.2865, 112.7900],  // Southwest
  [-7.2775, 112.7990]   // Northeast
);

// ITS Report Bounds (lebar - untuk drop pin)
const ITS_REPORT_BOUNDS = L.latLngBounds(
  [-7.2900, 112.7850],  // Southwest
  [-7.2750, 112.8050]   // Northeast
);

// App Configuration
const APP_CONFIG = {
  MAP_CENTER: [-7.2865, 112.793097],
  MAP_ZOOM: 15,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MIN_RESOLUTION: 300,
  STORAGE_BUCKET: 'toilet-photos'
};

// Admin credentials (for demo purposes)
const ADMIN_EMAIL = 'admin1@gmail.com';
const ADMIN_PASSWORD = 'adminada4';
