const ROW_ID = 1;
const FALLBACK_SUPABASE_URL = 'https://tzmpnfpntiyaciwcceau.supabase.co';
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function send(res, status, data) {
  res.status(status).json(data);
}

function normalizeSupabaseUrl(value) {
  const raw = String(value || '').trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  const withProtocol = withoutTrailingSlash && !/^https?:\/\//i.test(withoutTrailingSlash)
    ? `https://${withoutTrailingSlash}`
    : withoutTrailingSlash;

  if (/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(withProtocol)) {
    return withProtocol;
  }

  return FALLBACK_SUPABASE_URL;
}

function getSupabaseEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const url = normalizeSupabaseUrl(rawUrl);
  const key = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
}

function toJstDateString(date = new Date()) {
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00.000+09:00`);
  base.setDate(base.getDate() + days);
  return toJstDateString(base);
}

function formatDateLabel(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00.000+09:00`);
  return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' });
}

async function fetchTasks() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) throw new Error('Supabase env is missing');

  const response = await fetch(`${url}/rest/v1/app_state?id=eq.${ROW_ID}&select=data`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase fetch failed: ${response.status}`);

  const rows = await response.json();
  const data = rows?.[0]?.data;
  return Array.isArray(data) ? data : [];
}

function buildDigest(tasks) {
  const today = toJstDateString();
  const threeDaysLater = addDays(today, 3);
  const activeTasks = tasks.filter(task => task?.status !== 'done');
  const overdueTasks = activeTasks.filter(task => task.deadline && task.deadline < today);
  const todayTasks = activeTasks.filter(task => task.deadline === today);
  const soonTasks = activeTasks.filter(task => task.deadline && task.deadline > today && task.deadline <= threeDaysLater);

  const lines = [
    `RINNEタスク ${formatDateLabel(today)}`,
    '',
    '期限切れタスク',
    ...formatTaskLines(overdueTasks, true),
    '',
    '今日のタスク',
    ...formatTaskLines(todayTasks),
    '',
    '3日以内のタスク',
    ...formatTaskLines(soonTasks, true),
  ];

  return lines.join('\n');
}

function formatTaskLines(tasks, showDeadline = false) {
  if (tasks.length === 0) return ['・なし'];

  return tasks
    .sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')))
    .slice(0, 20)
    .map(task => {
      const prefix = task.priority === 'high' ? '・[高] ' : '・';
      const deadline = showDeadline && task.deadline ? ` (${formatDateLabel(task.deadline)})` : '';
      return `${prefix}${task.title}${deadline}`;
    });
}

async function broadcastToLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing');

  const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: String(text).slice(0, 4500) }],
    }),
  });

  if (!response.ok) throw new Error(`LINE broadcast failed: ${response.status}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const tasks = await fetchTasks();
    const message = buildDigest(tasks);
    await broadcastToLine(message);
    return send(res, 200, { ok: true, sent: true });
  } catch (error) {
    console.error(error);
    return send(res, 500, { ok: false, error: String(error?.message || error) });
  }
}
