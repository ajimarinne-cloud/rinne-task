import { useState } from 'react';
import { X, Trash2, ExternalLink } from 'lucide-react';
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, isOverdue, isDueSoon, parseDeadlineFromTitle } from './store';

const C = {
  bg: '#0e0c18', card: '#1a1728', border: '#2e2845',
  accent: '#c084fc', pink: '#f472b6', text: '#e2dff0', sub: '#9c8daa',
};

const input = {
  width: '100%', background: '#120f1e', border: `1px solid ${C.border}`,
  borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 14,
  outline: 'none',
};
const btn = (primary) => ({
  padding: '9px 18px', borderRadius: 99, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 700,
  background: primary ? `linear-gradient(135deg, ${C.accent}, ${C.pink})` : '#1f1c2e',
  color: primary ? '#fff' : C.sub,
});

export default function TaskDetail({ task, tasks, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState(task.status);
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [note, setNote] = useState(task.note || '');
  const [deps, setDeps] = useState(task.deps || []);
  const [priority, setPriority] = useState(task.priority || 'normal');

  const overdue = isOverdue(deadline);
  const soon = isDueSoon(deadline);
  const urlMatch = note.match(/https?:\/\/\S+/);

  const save = () => { onUpdate(task.id, { title, status, deadline: deadline || null, note, deps, priority }); onClose(); };
  const toggleDep = (id) => setDeps(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: '0 0 0 0' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.card, borderTop: `1px solid ${C.border}`,
        borderRadius: '24px 24px 0 0', padding: '20px 20px 32px',
        width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* ドラッグハンドル */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: '0 auto -6px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>タスク詳細</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {/* タイトル */}
        <div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>タイトル</div>
          <input
            style={input}
            value={title}
            onChange={e => {
              const v = e.target.value;
              setTitle(v);
              // 期限が空ならタイトルから自動認識（「7/8までに」「明日」など）
              if (!deadline) {
                const parsed = parseDeadlineFromTitle(v);
                if (parsed) setDeadline(parsed);
              }
            }}
          />
        </div>

        {/* ステータス・期限 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>ステータス</div>
            <select style={{ ...input }} value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, marginBottom: 6, fontWeight: 600, color: overdue ? '#f472b6' : soon ? '#a78bfa' : C.sub }}>
              期限 {overdue ? '⚠ 超過' : soon ? '· もうすぐ' : ''}
            </div>
            <input type="date" style={{ ...input, colorScheme: 'dark', cursor: 'pointer' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>

        {/* 優先度 */}
        <div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>優先度</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setPriority(k)} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                border: priority === k ? `1.5px solid ${PRIORITY_COLORS[k]}` : `1px solid ${C.border}`,
                background: priority === k ? PRIORITY_COLORS[k] + '22' : '#120f1e',
                color: priority === k ? PRIORITY_COLORS[k] : C.sub,
              }}>
                {k === 'high' ? '🔥 ' : ''}{v}
              </button>
            ))}
          </div>
        </div>

        {/* メモ */}
        <div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>メモ・URL</div>
          <textarea style={{ ...input, height: 72, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} placeholder="Zoom URLや補足など..." />
          {urlMatch && (
            <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.accent, fontSize: 12, marginTop: 6 }}>
              <ExternalLink size={12} /> リンクを開く
            </a>
          )}
        </div>

        {/* 依存タスク */}
        {tasks.filter(t => t.id !== task.id).length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontWeight: 600 }}>前提タスク</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tasks.filter(t => t.id !== task.id).map(t => (
                <button key={t.id} onClick={() => toggleDep(t.id)} style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: deps.includes(t.id) ? C.accent + '33' : '#1f1c2e',
                  color: deps.includes(t.id) ? C.accent : C.sub,
                  outline: deps.includes(t.id) ? `1px solid ${C.accent}` : 'none',
                }}>
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* アクション */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <button onClick={() => { onDelete(task.id); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', background: '#2a1020', color: '#f472b6', fontSize: 13, fontWeight: 600 }}>
            <Trash2 size={13} /> 削除
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn(false)}>キャンセル</button>
            <button onClick={save} style={btn(true)}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
