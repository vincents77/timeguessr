// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Read your keys from the environment file (.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;