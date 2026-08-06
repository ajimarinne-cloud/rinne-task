import { useState, useEffect } from 'react';
import { Plus, List, GitFork, CalendarDays, Archive as ArchiveIcon, FileText, Bell, LayoutGrid } from 'lucide-react';
import { useTasks, isOverdue, isDueSoon } from './store';
import TaskGraph from './TaskGraph';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';
import TranscriptImport from './TranscriptImport';
import Archive from './Archive';
import CalendarView from './CalendarView';
import Apps from './Apps';

const C = {
  bg: '#0e0c18',
  card: '#1a1728',
  border: '#2e2845',
  accent: '#c084fc',
  pink: '#f472b6',
  text: '#e2dff0',
  sub: '#9c8daa',
};

const s = {
  app: { display: 'flex', flexDirection: 'column', height: '100dvh', background: C.bg },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', height: 56, background: C.card,
    borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 8,
  },
  logo: {
    fontWeight: 800, fontSize: 17, color: C.text, letterSpacing: '-0.3px', flexShrink: 0,
    border: '2px solid #f97316', borderRadius: 8, padding: '3px 10px',
    boxShadow: '0 0 10px #f9731644',
  },
  logoRinne: { color: '#f97316' },
  logoTask: { color: C.text },
  tabs: { display: 'flex', gap: 2, flex: 1, justifyContent: 'center' },
  tab: (active) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
    background: active ? C.accent + '22' : 'transparent',
    color: active ? C.accent : C.sub,
    transition: 'all 0.15s',
  }),
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
    background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
    color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
    boxShadow: `0 2px 12px ${C.accent}44`,
  },
  importBtn: {
    display: 'flex', alignItems: 'center',
    padding: '7px', borderRadius: 99, border: `1px solid ${C.border}`, cursor: 'pointer',
    background: 'transparent', color: C.sub, flexShrink: 0,
  },
  main: { flex: 1, overflow: 'hidden' },
  alert: {
    padding: '7px 16px', fontSize: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#2a1535', borderBottom: `1px solid #3d1f52`,
  },
};

export default function App() {
  const { tasks, addTask, addTasks, updateTask, deleteTask } = useTasks();
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const today = new Date();
  const [calYm, setCalYm] = useState(today.getFullYear() * 12 + today.getMonth());

  const selectedTask = tasks.find(t => t.id === selectedId);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const overdueCount = activeTasks.filter(t => isOverdue(t.deadline)).length;
  const soonCount = activeTasks.filter(t => isDueSoon(t.deadline) && !isOverdue(t.deadline)).length;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const handleAdd = () => {
    const id = addTask({ title: '新しいタスク', status: 'todo' });
    setSelectedId(id);
  };

  const TABS = [
    { key: 'list', icon: <List size={13} />, label: 'リスト' },
    { key: 'graph', icon: <GitFork size={13} />, label: 'グラフ' },
    { key: 'calendar', icon: <CalendarDays size={13} />, label: 'カレンダー' },
    { key: 'archive', icon: <ArchiveIcon size={13} />, label: '振り返り' },
    { key: 'apps', icon: <LayoutGrid size={13} />, label: 'アプリ' },
  ];

  return (
    <div style={s.app}>
      <header style={s.header}>
        <span style={s.logo}><span style={s.logoRinne}>RINNE</span><span style={s.logoTask}>タスク</span></span>
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t.key} style={s.tab(view === t.key)} onClick={() => setView(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={s.importBtn} onClick={() => setShowImport(true)} title="議事録からインポート">
            <FileText size={15} />
          </button>
          <button style={s.addBtn} onClick={handleAdd}>
            <Plus size={14} /> 追加
          </button>
        </div>
      </header>

      {(overdueCount > 0 || soonCount > 0) && (
        <div style={s.alert}>
          <Bell size={13} style={{ color: C.pink }} />
          {overdueCount > 0 && <span style={{ color: '#f9a8d4' }}>期限超過 {overdueCount}件</span>}
          {soonCount > 0 && <span style={{ color: '#d8b4fe' }}>もうすぐ期限 {soonCount}件</span>}
        </div>
      )}

      <div style={s.main}>
        {view === 'list' && <TaskList tasks={activeTasks} onSelectTask={setSelectedId} />}
        {view === 'graph' && <TaskGraph tasks={activeTasks} onSelectTask={setSelectedId} />}
        {view === 'calendar' && <CalendarView key={calYm} tasks={activeTasks} onSelectTask={setSelectedId} ym={calYm} onPrev={() => setCalYm(v => v - 1)} onNext={() => setCalYm(v => v + 1)} />}
        {view === 'archive' && <Archive tasks={tasks} onSelectTask={setSelectedId} />}
        {view === 'apps' && <Apps />}
      </div>

      {selectedTask && (
        <TaskDetail task={selectedTask} tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} onClose={() => setSelectedId(null)} />
      )}
      {showImport && <TranscriptImport onAdd={addTasks} onClose={() => setShowImport(false)} />}
    </div>
  );
}
