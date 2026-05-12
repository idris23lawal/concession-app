import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xxbukpajincuazpedspc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YnVrcGFqaW5jdWF6cGVkc3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjA3NTksImV4cCI6MjA5MjI5Njc1OX0.PSVusE1p-hQeWN0whFhJG-6LauehDD-cWJY3XaSMNTs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)