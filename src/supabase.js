import { createClient } from '@supabase/supabase-js';

// Vercelの環境変数（またはローカルの .env ファイル）から読む。
// 未設定ならnullになり、アプリはlocalStorageのみで動く。
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const ROW_ID = 1; // 個人利用なので1行だけ使う

// クラウドからタスク一覧を取得（未設定・失敗時はnull）
export async function fetchCloudTasks() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  } catch (e) {
    console.warn('cloud fetch failed:', e.message);
    return null;
  }
}

// クラウドへ保存
export async function saveCloudTasks(tasks) {
  if (!supabase) return;
  try {
    await supabase
      .from('app_state')
      .upsert({ id: ROW_ID, data: tasks, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn('cloud save failed:', e.message);
  }
}
