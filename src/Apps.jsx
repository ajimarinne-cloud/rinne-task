import { useState } from 'react';
import { ExternalLink, Trash2, Plus } from 'lucide-react';
import { useApps } from './appsStore';

const C = { card: '#1a1728', border: '#2e2845', accent: '#c084fc', pink: '#f472b6', text: '#e2dff0', sub: '#9c8daa' };

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function Apps() {
  const { apps, addApp, deleteApp } = useApps();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    const cleanUrl = normalizeUrl(url);
    if (!name.trim() || !cleanUrl) return;
    addApp({ name: name.trim(), url: cleanUrl });
    setName('');
    setUrl('');
  };

  return (
    <div style={{ padding: '20px 16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: '#4a4060', marginBottom: 16 }}>CCでよく使うアプリのリンク集</div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 14, marginBottom: 16,
      }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="アプリ名（例：返信テンプレ・メモ）"
          style={{
            background: '#120f1e', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
          }}
        />
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="URL（例：example.com）"
          style={{
            background: '#120f1e', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={handleAdd} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '9px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
          color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          <Plus size={14} /> 追加
        </button>
      </div>

      {apps.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔗</div>
          <div style={{ color: C.sub, fontSize: 14 }}>まだアプリが登録されていません</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {apps.map(app => (
            <div key={app.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '12px 16px',
            }}>
              <a href={app.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8, color: C.text,
                textDecoration: 'none', fontSize: 14, fontWeight: 600, overflow: 'hidden',
              }}>
                <ExternalLink size={14} color={C.accent} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.name}</span>
              </a>
              <button onClick={() => deleteApp(app.id)} style={{
                display: 'flex', alignItems: 'center', border: 'none', background: 'transparent',
                cursor: 'pointer', color: '#5c5270', padding: 4, flexShrink: 0,
              }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
