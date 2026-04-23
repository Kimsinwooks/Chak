import { createClient } from '@supabase/supabase-js';

// 변수가 비어있는지 콘솔에 찍어서 디버깅할 수 있게 해줘
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase 환경 변수가 로드되지 않았습니다. .env 파일과 VITE_ 접두어를 확인하세요.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);