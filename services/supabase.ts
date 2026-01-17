
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://posoohzlirpndvxuhgjg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__w35ciXVQvV8Iu1TyEQY9Q_ps0r3WNK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
