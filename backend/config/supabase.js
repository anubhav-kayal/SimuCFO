require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not set in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;


