import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { groupByMonth } from './store';

const C = { card: '#1a1728', border: '#2e2845', accent: '#c084fc', text: '#e2dff0', sub: '#9c8daa' };
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function formatKey(key) {
  if (key === 'unknown') return '日付不明';
  const [y, m] = key.split('-');
  return `${y}年 ${MONTHS[parseInt(m, 10) - 1]}`;
}

export default function Archive({ tasks, onSelectTask }) {
  const groups = groupByMonth(tasks);
  const [open, setOpen] = useState(new Set(groups.slice(0, 1).map(([k]) => k)));
  const toggle = key => setOpen(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  if (groups.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ fontSize: 32 }}>✓</div>
      <div style={{ color: C.sub, fontSize: 14 }}>完了タスクがまだありません</div>
    </div>
  );

  return (
    <div style={{ padding: '20px 16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: '#4a4060', marginBottom: 16 }}>完了タスクを月別に振り返れます</div>
      {groups.map(([key, items]) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <button onClick={() => toggle(key)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: '12px 16px', cursor: 'pointer', color: C.text, marginBottom: open.has(key) ? 6 : 0,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{formatKey(key)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: C.accent, background: C.accent + '22', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>
                {items.length}件完了
              </span>
              {open.has(key) ? <ChevronDown size={14} color={C.sub} /> : <ChevronRight size={14} color={C.sub} />}
            </div>
          </button>
          {open.has(key) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(task => (
                <div key={task.id} onClick={() => onSelectTask(task.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 16px', background: '#120f1e', borderRadius: 10, cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent }} />
                    <span style={{ fontSize: 13, color: '#7a6d8a' }}>{task.title}</span>
                  </div>
                  {task.completedAt && <span style={{ fontSize: 11, color: '#3d3356' }}>{task.completedAt}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
