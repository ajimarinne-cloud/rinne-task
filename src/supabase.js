import { createClient } from '@supabase/supabase-js';

// Vercelの環境変数（またはローカルの .env ファイル）から読む。
// 未設定ならnullになり、アプリはlocalStorageのみで動く。
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const ROW_ID = 1; // 個人利用なので1行だけ使う（タスク）
const APPS_ROW_ID = 2; // よく使うアプリ一覧用の行

// クラウドから指定行のdataを取得（未設定・失敗時はnull）
async function fetchCloudRow(rowId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', rowId)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  } catch (e) {
    console.warn('cloud fetch failed:', e.message);
    return null;
  }
}

// クラウドの指定行へ保存
async function saveCloudRow(rowId, data) {
  if (!supabase) return;
  try {
    await supabase
      .from('app_state')
      .upsert({ id: rowId, data, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn('cloud save failed:', e.message);
  }
}

export const fetchCloudTasks = () => fetchCloudRow(ROW_ID);
export const saveCloudTasks = (tasks) => saveCloudRow(ROW_ID, tasks);
export const fetchCloudApps = () => fetchCloudRow(APPS_ROW_ID);
export const saveCloudApps = (apps) => saveCloudRow(APPS_ROW_ID, apps);
