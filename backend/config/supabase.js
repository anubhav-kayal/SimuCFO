require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Use SERVICE ROLE key for backend access!

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or KEY is not set in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;


