import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szpzzhyfancotvotkklv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cHp6aHlmYW5jb3R2b3Rra2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTcxNDIsImV4cCI6MjA4NzMzMzE0Mn0.u7bdbkWitrpV1wiRl-XJhOire1nZSXhMra8f9hhEKuU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const SUPABASE_FUNCTIONS_URL = 'https://szpzzhyfancotvotkklv.supabase.co/functions/v1';
