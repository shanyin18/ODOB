import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://aeinnrgcqwpcadmmovho.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ltpgKx4qf_xgOWhRAis2-Q_fnrpfhWR'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
