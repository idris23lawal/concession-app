import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xxbukpajincuazpedspc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_-uurPkn7N3RV70lhdxs4pg_BdZHqv1D'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)