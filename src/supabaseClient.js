import { createClient } from '@supabase/supabase-js';

// 請在 Supabase 後台的 Project Settings -> API 找到這兩串 URL 與 KEY 並替換掉
const supabaseUrl = 'https://basszpxlzsdupjvxeuwq.supabase.co';
const supabaseAnonKey = 'sb_publishable_-1nMA2_8fkcQEf_UkDz4vQ_Wy1jAkF-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);