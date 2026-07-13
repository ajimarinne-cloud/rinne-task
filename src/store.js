import { useState, useEffect, useRef } from 'react';
import { fetchCloudTasks, saveCloudTasks, supabase } from './supabase';

const STORAGE_KEY = 'taskmanager_v1';

const defaultTasks = [
  { id: '1', title: 'デザイン確定', status: 'done', deadline: null, deps: [], note: '', completedAt: '2026-06-15' },
  { id: '2', title: 'フロント実装', status: 'doing', deadline: '2026-07-05', deps: ['1'], note: '', completedAt: null },
  { id: '3', title: 'バックエンドAPI', status: 'doing', deadline: '2026-07-03', deps: ['1'], note: '', completedAt: null },
  { id: '4', title: 'テスト', status: 'todo', deadline: '2026-07-08', deps: ['2', '3'], note: '', completedAt: null },
  { id: '5', title: 'リリース', status: 'todo', deadline: '2026-07-10', deps: ['4'], note: '', completedAt: null },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultTasks;
  } catch {
    return defaultTasks;
  }
}

function save(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// タイトルから期限を自動認識（「7/8までに」「明日」「今日」「7月8日」など）
export function parseDeadlineFromTitle(title) {
  if (!title) return null;
  const now = new Date();
  const y = now.getFullYear();
  const pad2 = n => String(n).padStart(2, '0');
  const toStr = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  // 今日・明日・明後日
  if (/今日中?|本日/.test(title)) return toStr(now);
  if (/明日/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 1));
  if (/明後日/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 2));

  // 「7/8」「07/08」形式
  let m = title.match(/(\d{1,2})[\/月](\d{1,2})日?/);
  if (m) {
    const month = parseInt(m[1], 10), day = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let d = new Date(y, month - 1, day);
      // 過去日付なら来年と解釈
      if (d < new Date(now.toDateString())) d = new Date(y + 1, month - 1, day);
      return toStr(d);
    }
  }

  // 「金曜までに」「月曜日までに」
  const dowMap = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  m = title.match(/([日月火水木金土])曜日?(まで|に)/);
  if (m) {
    const target = dowMap[m[1]];
    const diff = (target - now.getDay() + 7) % 7 || 7; // 同じ曜日なら来週
    return toStr(new Date(y, now.getMonth(), now.getDate() + diff));
  }

  // 「来週」→ 7日後
  if (/来週/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 7));

  return null;
}

export function useTasks() {
  const [tasks, setTasks] = useState(load);
  const [synced, setSynced] = useState(!supabase); // クラウド未設定ならローカルのみ
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  // 起動時にクラウドから読み込み（クラウドが正、なければローカルをアップロード）
  useEffect(() => {
    if (!supabase) return;
    fetchCloudTasks().then(cloud => {
      if (cloud && Array.isArray(cloud)) {
        setTasks(cloud);
      }
      loaded.current = true;
      setSynced(true);
    });
  }, []);

  // 変更をローカル保存＋クラウドへdebounce保存
  useEffect(() => {
    save(tasks);
    if (!supabase || !loaded.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCloudTasks(tasks), 800);
    return () => clearTimeout(saveTimer.current);
  }, [tasks]);

  const addTask = (task) => {
    const id = Date.now().toString();
    setTasks(prev => [...prev, { id, status: 'todo', deps: [], note: '', completedAt: null, priority: 'normal', ...task }]);
    return id;
  };

  const updateTask = (id, patch) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...patch };
      // タイトル変更時、期限が未設定ならタイトルから自動認識
      if (patch.title && !updated.deadline) {
        const parsed = parseDeadlineFromTitle(patch.title);
        if (parsed) updated.deadline = parsed;
      }
      // 完了になった瞬間にcompletedAtを記録
      if (patch.status === 'done' && t.status !== 'done') {
        updated.completedAt = new Date().toISOString().slice(0, 10);
      }
      // 完了から戻したらリセット
      if (patch.status && patch.status !== 'done') {
        updated.completedAt = null;
      }
      return updated;
    }));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev
      .filter(t => t.id !== id)
      .map(t => ({ ...t, deps: t.deps.filter(d => d !== id) }))
    );
  };

  const addTasks = (newTasks) => {
    setTasks(prev => [...prev, ...newTasks.map(t => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      status: 'todo', deps: [], note: '', completedAt: null, priority: 'normal',
      deadline: t.deadline || parseDeadlineFromTitle(t.title),
      ...t,
    }))]);
  };

  return { tasks, addTask, addTasks, updateTask, deleteTask, synced };
}

export function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

export function isDueSoon(deadline) {
  if (!deadline) return false;
  const diff = new Date(deadline) - new Date(new Date().toDateString());
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

// 完了タスクを月別にグループ化
export function groupByMonth(tasks) {
  const done = tasks.filter(t => t.status === 'done');
  const groups = {};
  done.forEach(t => {
    const key = t.completedAt ? t.completedAt.slice(0, 7) : 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

// 文字起こしからタスク候補を抽出
export function extractTasksFromText(text) {
  const candidates = [];
  const seen = new Set();

  // まず改行・句点で分割
  const lines = text.split(/\n/);

  lines.forEach(raw => {
    const line = raw.trim();
    if (!line || line.length < 2 || line.length > 100) return;

    // 番号付きリスト: 1. / ① / (1) など
    const mNum = line.match(/^[①②③④⑤⑥⑦⑧⑨⑩][\s　]*(.*)/);
    const mNum2 = line.match(/^[\d]+[.．）\)]\s*(.+)/);
    // 箇条書き: ・ - * □ ▶ など
    const mBullet = line.match(/^[・\-\*□▶▷◆●○→]\s*(.+)/);
    // 【アクション】や[TODO]など
    const mBracket = line.match(/^[【\[【](?:TODO|タスク|アクション|ACTION|ToDo|確認|対応)[】\]】]?\s*(.+)/i);
    // タブや全角スペースで始まるインデント行
    const mIndent = line.match(/^[\t　]\s*(.+)/);

    // アクション動詞を含む文（句点で終わる短い文も含む）
    const actionWords = /する|します|してください|しましょう|お願い|確認|作成|実装|修正|対応|送付|共有|連絡|設定|準備|提出|チェック|レビュー|依頼|更新|追加|削除|検討|調査|担当|取り組|進め|完了さ/;

    let title = null;

    if (mBracket) title = mBracket[1];
    else if (mNum) title = mNum[1];
    else if (mNum2) title = mNum2[1];
    else if (mBullet) title = mBullet[1];
    else if (mIndent) title = mIndent[1];
    else if (actionWords.test(line) && line.length <= 60) title = line;

    if (title) {
      // 後ろの句点・記号を除去
      title = title.replace(/[。！？\.!?]+$/, '').trim();
      // 括弧内の補足を除去（任意）
      title = title.replace(/（[^）]{0,20}）$/, '').trim();
    }

    if (title && title.length >= 2 && title.length <= 60 && !seen.has(title)) {
      seen.add(title);
      candidates.push(title);
    }
  });

  return candidates.slice(0, 30); // 最大30件
}

export const STATUS_LABELS = { todo: '未着手', doing: '進行中', done: '完了', waiting: '待ち' };
export const PRIORITY_LABELS = { high: '高', normal: '中', low: '低' };
export const PRIORITY_COLORS = { high: '#f97316', normal: '#9c8daa', low: '#4a4060' };
export const STATUS_COLORS = {
  todo: '#4a4a4a',
  doing: '#1d6fcc',
  done: '#1a7a3c',
  waiting: '#7a5c1a',
};
