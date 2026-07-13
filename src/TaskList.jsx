import { isOverdue, isDueSoon, STATUS_LABELS } from './store';
import { Clock, AlertCircle, ChevronRight, Sun, CheckCircle2 } from 'lucide-react';

const C = {
  card: '#1a1728', border: '#2e2845', accent: '#c084fc', pink: '#f472b6',
  text: '#e2dff0', sub: '#9c8daa',
};

// セクションごとのカラー設定
const SECTION = {
  overdue: { label: '期限超過', color: '#f472b6', bg: '#f472b611', border: '#f472b633', dot: '#f472b6' },
  doing:   { label: '進行中',   color: '#60a5fa', bg: '#60a5fa11', border: '#60a5fa33', dot: '#60a5fa' },
  soon:    { label: '3日以内',  color: '#a78bfa', bg: '#a78bfa11', border: '#a78bfa33', dot: '#a78bfa' },
  todo:    { label: '未着手',   color: '#9c8daa', bg: '#1a1728',   border: '#2e2845',   dot: '#5a4d70' },
  waiting: { label: '待ち',     color: '#fbbf24', bg: '#fbbf2411', border: '#fbbf2433', dot: '#fbbf24' },
};

function TaskCard({ task, sectionKey }) {
  const overdue = isOverdue(task.deadline);
  const soon = isDueSoon(task.deadline);
  const sec = SECTION[sectionKey];

  return (
    <div style={{
      background: sec.bg,
      border: `1px solid ${sec.border}`,
      borderLeft: `3px solid ${sec.dot}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', transition: 'opacity 0.15s',
    }}
      onClick={e => e.currentTarget._onClick && e.currentTarget._onClick()}
      ref={el => { if (el) el._onClick = null; }}
    >
      {/* このコンポーネントはSection経由でonClickを使う */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.priority === 'high' && <span style={{ marginRight: 4 }}>🔥</span>}
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          {task.deadline && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? '#f472b6' : soon ? '#a78bfa' : C.sub }}>
              {overdue ? <AlertCircle size={12} /> : <Clock size={12} />}
              {task.deadline}
              {overdue && <span style={{ fontWeight: 700 }}>· 超過</span>}
              {!overdue && soon && <span style={{ fontWeight: 700 }}>· もうすぐ</span>}
            </span>
          )}
          {task.deps.length > 0 && (
            <span style={{ color: '#5a4d70', fontSize: 11 }}>前提{task.deps.length}件</span>
          )}
        </div>
      </div>
      <span style={{
        padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0,
        color: sec.dot, background: sec.bg,
        border: `1px solid ${sec.dot}44`,
      }}>
        {STATUS_LABELS[task.status]}
      </span>
      <ChevronRight size={15} style={{ color: '#3d3356', flexShrink: 0 }} />
    </div>
  );
}

function Section({ secKey, items, onSelectTask }) {
  const sec = SECTION[secKey];
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      {/* セクションヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
      }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: sec.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: sec.color, letterSpacing: '0.03em' }}>
          {sec.label}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: sec.dot, background: sec.bg,
          border: `1px solid ${sec.dot}55`,
          padding: '2px 10px', borderRadius: 99,
        }}>
          {items.length}件
        </span>
      </div>
      {/* カード一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(t => (
          <div key={t.id} onClick={() => onSelectTask(t.id)} style={{ cursor: 'pointer' }}>
            <TaskCard task={t} sectionKey={secKey} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayCard({ tasks, onSelectTask }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = tasks.filter(t =>
    t.deadline === todayStr || isOverdue(t.deadline) || t.status === 'doing' || t.priority === 'high'
  );
  // 重複除去 → 優先度:高 → 超過 → 今日期限 → 進行中 の順に並べる
  const rank = t => {
    if (t.priority === 'high') return 0;
    if (isOverdue(t.deadline)) return 1;
    if (t.deadline === todayStr) return 2;
    return 3;
  };
  const unique = [...new Map(todayItems.map(t => [t.id, t])).values()].sort((a, b) => rank(a) - rank(b));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'おはようございます ☀️';
    if (h < 17) return 'お疲れ様です 🌤️';
    return 'お疲れ様でした 🌙';
  })();

  const dateLabel = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1030 0%, #1a1728 100%)',
      border: '1px solid #c084fc44',
      borderRadius: 18, padding: '16px 18px', marginBottom: 24,
      boxShadow: '0 4px 24px #c084fc11',
    }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <Sun size={16} style={{ color: '#f97316' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#e2dff0' }}>今日やること</span>
          </div>
          <div style={{ fontSize: 11, color: '#7a6d8a' }}>{dateLabel} · {greeting}</div>
        </div>
        <span style={{
          fontSize: 22, fontWeight: 900, color: unique.length === 0 ? '#34d399' : '#c084fc',
          lineHeight: 1,
        }}>
          {unique.length === 0 ? '✓' : unique.length}
        </span>
      </div>

      {/* タスクリスト */}
      {unique.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 13 }}>
          <CheckCircle2 size={16} />
          今日のタスクはすべて完了！
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {unique.map(t => {
            const over = isOverdue(t.deadline);
            const today = t.deadline === todayStr;
            const high = t.priority === 'high';
            const tagColor = high ? '#f97316' : over ? '#f472b6' : today ? '#f97316' : '#60a5fa';
            const tagLabel = high ? '🔥 優先' : over ? '超過' : today ? '今日' : '進行中';
            return (
              <div key={t.id} onClick={() => onSelectTask(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                background: '#120f1e',
                border: `1px solid ${tagColor}33`,
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1530'}
                onMouseLeave={e => e.currentTarget.style.background = '#120f1e'}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: tagColor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#e2dff0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: tagColor, background: tagColor + '22', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                  {tagLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
const byPriority = (a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);

export default function TaskList({ tasks: rawTasks, onSelectTask }) {
  const tasks = [...rawTasks].sort(byPriority);
  const overdue  = tasks.filter(t => isOverdue(t.deadline));
  const doing    = tasks.filter(t => t.status === 'doing' && !isOverdue(t.deadline) && !isDueSoon(t.deadline));
  const soon     = tasks.filter(t => !isOverdue(t.deadline) && isDueSoon(t.deadline));
  const todo     = tasks.filter(t => t.status === 'todo' && !isOverdue(t.deadline) && !isDueSoon(t.deadline));
  const waiting  = tasks.filter(t => t.status === 'waiting' && !isOverdue(t.deadline) && !isDueSoon(t.deadline));

  return (
    <div style={{ padding: '20px 16px', overflowY: 'auto', height: '100%' }}>
      <TodayCard tasks={tasks} onSelectTask={onSelectTask} />
      <Section secKey="overdue" items={overdue}  onSelectTask={onSelectTask} />
      <Section secKey="soon"    items={soon}     onSelectTask={onSelectTask} />
      <Section secKey="doing"   items={doing}    onSelectTask={onSelectTask} />
      <Section secKey="todo"    items={todo}     onSelectTask={onSelectTask} />
      <Section secKey="waiting" items={waiting}  onSelectTask={onSelectTask} />
    </div>
  );
}
