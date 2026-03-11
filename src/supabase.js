import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htlpdhjcxuxevmfqaxsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHBkaGpjeHV4ZXZtZnFheHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjYxNTQsImV4cCI6MjA4ODc0MjE1NH0.iM5_W5ME2_qcm3FgWqSXa5JhQV5lbkzFz2CaudL8C18';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
