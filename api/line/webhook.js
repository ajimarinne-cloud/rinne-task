import crypto from 'crypto';

const ROW_ID = 1;
const FALLBACK_SUPABASE_URL = 'https://tzmpnfpntyiaciwcceau.supabase.co';

function send(res, status, data) {
  res.status(status).json(data);
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const digest = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function parseDeadlineFromTitle(title) {
  if (!title) return null;
  const now = new Date();
  const y = now.getFullYear();
  const pad2 = n => String(n).padStart(2, '0');
  const toStr = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  if (/今日中?|本日/.test(title)) return toStr(now);
  if (/明日/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 1));
  if (/明後日/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 2));

  let m = title.match(/(\d{1,2})[\/月](\d{1,2})日?/);
  if (m) {
    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let d = new Date(y, month - 1, day);
      if (d < new Date(now.toDateString())) d = new Date(y + 1, month - 1, day);
      return toStr(d);
    }
  }

  const dowMap = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  m = title.match(/([日月火水木金土])曜日?(まで|に)/);
  if (m) {
    const target = dowMap[m[1]];
    const diff = (target - now.getDay() + 7) % 7 || 7;
    return toStr(new Date(y, now.getMonth(), now.getDate() + diff));
  }

  if (/来週/.test(title)) return toStr(new Date(y, now.getMonth(), now.getDate() + 7));
  return null;
}

function createTask(title) {
  const cleanTitle = title.trim().replace(/[。！？\.!?]+$/, '');
  return {
    id: `${Date.now()}${Math.random().toString(36).slice(2)}`,
    title: cleanTitle,
    status: 'todo',
    deadline: parseDeadlineFromTitle(cleanTitle),
    deps: [],
    note: 'LINEから追加',
    completedAt: null,
    priority: 'normal',
    createdAt: new Date().toISOString(),
    source: 'line',
  };
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

  try {
    console.info(`Using Supabase host: ${new URL(url).host}`);
  } catch {
    console.info('Using Supabase host: invalid-url');
  }

  return { url, key };
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

async function saveTasks(tasks) {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) throw new Error('Supabase env is missing');

  const response = await fetch(`${url}/rest/v1/app_state?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ id: ROW_ID, data: tasks, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Supabase save failed: ${response.status}`);
}

async function replyToLine(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!response.ok) {
    console.warn(`LINE reply failed: ${response.status}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const rawBody = await readRawBody(req);
  const signature = req.headers['x-line-signature'];

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return send(res, 401, { ok: false, error: 'Invalid LINE signature' });
  }

  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return send(res, 400, { ok: false, error: 'Invalid JSON body' });
  }

  try {
    const textEvents = (body.events || []).filter(event =>
      event.type === 'message' && event.message?.type === 'text' && event.message.text?.trim()
    );

    if (textEvents.length === 0) return send(res, 200, { ok: true, added: 0 });

    const existingTasks = await fetchTasks();
    const newTasks = textEvents.map(event => createTask(event.message.text));
    await saveTasks([...existingTasks, ...newTasks]);

    await Promise.allSettled(textEvents.map(event =>
      replyToLine(event.replyToken, `タスクに追加しました: ${event.message.text.trim()}`)
    ));

    return send(res, 200, { ok: true, added: newTasks.length });
  } catch (error) {
    console.error(error);
    return send(res, 500, { ok: false, error: 'Failed to add LINE task' });
  }
}
