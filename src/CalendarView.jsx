import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isOverdue, isDueSoon } from './store';

const C = {
  card: '#1a1728', border: '#2e2845', accent: '#c084fc', pink: '#f472b6',
  text: '#e2dff0', sub: '#9c8daa', bg: '#0e0c18',
};
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function CalendarView({ tasks, onSelectTask, ym, onPrev, onNext }) {
  const [selected, setSelected] = useState(null);

  const year = Math.floor(ym / 12);
  const month = ym % 12;
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const days = getCalendarDays(year, month);

  const byDate = {};
  tasks.forEach(t => {
    if (!t.deadline) return;
    if (!byDate[t.deadline]) byDate[t.deadline] = [];
    byDate[t.deadline].push(t);
  });

  const selectedDateStr = selected !== null ? toDateStr(year, month, selected) : null;
  const selectedTasks = selectedDateStr ? (byDate[selectedDateStr] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 月ナビ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px', flexShrink: 0 }}>
        <button type="button" onClick={onPrev} style={navBtn}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.text, letterSpacing: '-0.3px' }}>
          {year}<span style={{ color: C.sub, fontSize: 13, fontWeight: 400 }}>年</span> {month + 1}<span style={{ color: C.sub, fontSize: 13, fontWeight: 400 }}>月</span>
        </span>
        <button type="button" onClick={onNext} style={navBtn}><ChevronRight size={16} /></button>
      </div>

      {/* 曜日 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 12px 4px', flexShrink: 0 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0', color: i === 0 ? '#f472b6' : i === 6 ? '#60a5fa' : C.sub }}>{d}</div>
        ))}
      </div>

      {/* グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 12px', gap: 3, flexShrink: 0 }}>
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const dateStr = toDateStr(year, month, d);
          const dayTasks = byDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = selected === d;
          const dow = new Date(year, month, d).getDay();
          const hasOverdue = dayTasks.some(t => isOverdue(t.deadline));
          const hasSoon = dayTasks.some(t => isDueSoon(t.deadline));

          return (
            <div key={`${year}-${month}-${d}`} onClick={() => setSelected(isSelected ? null : d)} style={{
              minHeight: 52, padding: '5px 4px', borderRadius: 10, cursor: 'pointer',
              background: isSelected ? C.accent + '22' : isToday ? '#1f1c30' : 'transparent',
              border: isSelected ? `1px solid ${C.accent}` : isToday ? `1px solid ${C.accent}44` : '1px solid transparent',
              transition: 'all 0.1s',
            }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, marginBottom: 3, textAlign: 'center', color: isToday ? C.accent : dow === 0 ? '#f472b6' : dow === 6 ? '#60a5fa' : C.text }}>{d}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTasks.slice(0, 2).map(t => (
                  <div key={t.id} onClick={e => { e.stopPropagation(); onSelectTask(t.id); }} style={{
                    fontSize: 9, padding: '2px 5px', borderRadius: 4, cursor: 'pointer',
                    background: hasOverdue && isOverdue(t.deadline) ? '#f472b633' : hasSoon && isDueSoon(t.deadline) ? '#a78bfa33' : C.accent + '22',
                    color: hasOverdue && isOverdue(t.deadline) ? '#f472b6' : hasSoon && isDueSoon(t.deadline) ? '#a78bfa' : C.accent,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>{t.title}</div>
                ))}
                {dayTasks.length > 2 && <div style={{ fontSize: 9, color: C.sub, textAlign: 'center' }}>+{dayTasks.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 選択日 */}
      {selected !== null && (
        <div style={{ margin: '10px 12px 0', padding: '12px 14px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 8, fontWeight: 600 }}>{month + 1}月{selected}日</div>
          {selectedTasks.length === 0
            ? <div style={{ fontSize: 13, color: '#3d3356' }}>タスクなし</div>
            : selectedTasks.map(t => (
              <div key={t.id} onClick={() => onSelectTask(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 10, cursor: 'pointer', background: '#120f1e', marginBottom: 4,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOverdue(t.deadline) ? '#f472b6' : isDueSoon(t.deadline) ? '#a78bfa' : C.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.text }}>{t.title}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 14, padding: '10px 14px', fontSize: 10, color: '#4a4060', marginTop: 'auto', flexShrink: 0 }}>
        {[['#f472b6', '期限超過'], ['#a78bfa', 'もうすぐ'], [C.accent, '通常']].map(([color, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

const navBtn = {
  background: '#1a1728', border: '1px solid #2e2845', borderRadius: 99,
  color: '#9c8daa', cursor: 'pointer', padding: '6px 10px',
  display: 'flex', alignItems: 'center',
};
