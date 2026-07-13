import { useState } from 'react';
import { X, Wand2, Check, Square } from 'lucide-react';
import { extractTasksFromText } from './store';

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 16,
  },
  panel: {
    background: '#1c1c1c', border: '1px solid #333', borderRadius: 16,
    padding: 24, width: '100%', maxWidth: 560,
    display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh',
  },
  textarea: {
    width: '100%', height: 160, background: '#111',
    border: '1px solid #333', borderRadius: 10,
    padding: '10px 12px', color: '#e5e5e5', fontSize: 13,
    resize: 'vertical', fontFamily: 'inherit',
  },
  candidateList: {
    overflowY: 'auto', maxHeight: 280,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  candidate: (selected) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
    background: selected ? '#1a3a5c' : '#252525',
    border: selected ? '1px solid #3b82f6' : '1px solid transparent',
    transition: 'all 0.1s',
  }),
  btn: (primary) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
    background: primary ? '#1d6fcc' : '#2a2a2a',
    color: primary ? '#fff' : '#aaa',
  }),
};

export default function TranscriptImport({ onAdd, onClose }) {
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const extract = () => {
    const found = extractTasksFromText(text);
    setCandidates(found);
    setSelected(new Set(found)); // デフォルト全選択
  };

  const toggle = (title) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates));
  };

  const confirm = () => {
    const tasks = [...selected].map(title => ({ title }));
    onAdd(tasks);
    onClose();
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>文字起こし・議事録からタスク抽出</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Zoomやtldvのサマリーをそのまま貼り付けてください</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!candidates ? (
          <>
            <textarea
              style={s.textarea}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`例：\n・Aさんにデザイン案を送付する\n・来週までにAPI仕様書を作成します\n・テスト環境の確認をしてください\n\n（箇条書き、番号付きリスト、普通の文章もOK）`}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={onClose}>キャンセル</button>
              <button
                style={{ ...s.btn(true), display: 'flex', alignItems: 'center', gap: 6, opacity: text.trim() ? 1 : 0.5 }}
                onClick={extract}
                disabled={!text.trim()}
              >
                <Wand2 size={14} /> タスクを抽出
              </button>
            </div>
          </>
        ) : (
          <>
            {candidates.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>
                タスクらしい文章が見つかりませんでした。<br />
                箇条書きや「〜する」「〜してください」の文が含まれているか確認してください。
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#aaa' }}>{candidates.length}件のタスク候補が見つかりました</span>
                  <button
                    onClick={toggleAll}
                    style={{ fontSize: 12, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {selected.size === candidates.length ? 'すべて解除' : 'すべて選択'}
                  </button>
                </div>
                <div style={s.candidateList}>
                  {candidates.map(title => (
                    <div key={title} style={s.candidate(selected.has(title))} onClick={() => toggle(title)}>
                      {selected.has(title)
                        ? <Check size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        : <Square size={16} style={{ color: '#444', flexShrink: 0 }} />
                      }
                      <span style={{ fontSize: 13 }}>{title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setCandidates(null)}>← 戻る</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn(false)} onClick={onClose}>キャンセル</button>
                <button
                  style={{ ...s.btn(true), opacity: selected.size ? 1 : 0.5 }}
                  onClick={confirm}
                  disabled={!selected.size}
                >
                  {selected.size}件を追加
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
