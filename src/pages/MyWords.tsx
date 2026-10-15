import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Volume2 } from 'lucide-react';
import { builtinById, POS_OPTIONS, type Word } from '../data/words';
import { useProgress } from '../contexts/ProgressContext';
import { speak, type CustomInput } from '../lib/db';

const empty: CustomInput = { word: '', pos: '', meaning: '', example: '' };

/** "단어 - 뜻", "단어: 뜻", "단어 | 뜻", 탭 구분을 모두 받아줌 */
function parseBulk(text: string): CustomInput[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.match(/^(.+?)\s*(?:\t|\s[-–]\s|:|\|)\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ word: m[1].trim(), pos: '', meaning: m[2].trim(), example: '' }));
}

export default function MyWords() {
  const { customWords, addCustom, editCustom, removeCustom, toggleStar, progress, loaded, setLevel } = useProgress();
  const [form, setForm] = useState<CustomInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const mine = new Set(customWords.map((w) => w.word.toLowerCase()));

  /** 기본 단어에 이미 있거나 내 단어에 이미 있으면 걸러냄 */
  function split(items: CustomInput[]) {
    const fresh: CustomInput[] = [];
    const builtin: Word[] = [];
    const dup: string[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      const key = it.word.toLowerCase();
      const b = builtinById.get(key);
      if (b) builtin.push(b);
      else if (mine.has(key) || seen.has(key)) dup.push(it.word);
      else { seen.add(key); fresh.push(it); }
    }
    return { fresh, builtin, dup };
  }

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: '저장하지 못했어요. 잠시 후 다시 시도해주세요.' });
    }
    setBusy(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const item = { ...form, word: form.word.trim(), meaning: form.meaning.trim(), example: form.example.trim() };
    if (editing) {
      run(async () => {
        await editCustom(editing, item);
        setEditing(null);
        setForm(empty);
        return `'${item.word}' 수정했어요.`;
      });
      return;
    }
    const { fresh, builtin, dup } = split([item]);
    if (builtin.length) {
      const b = builtin[0];
      const where = `'${b.word}'(${b.meaning})는 이미 ${b.level === 'basic' ? '기본' : '고급'} 단어에 있어요.`;
      if (progress.get(b.id)?.starred) {
        setMsg({ ok: true, text: `${where} 오답노트에도 담겨 있어요.` });
        return;
      }
      run(async () => {
        await toggleStar(b.id);
        setForm(empty);
        return `${where} 대신 오답노트에 담아뒀어요.`;
      });
      return;
    }
    if (dup.length) {
      setMsg({ ok: false, text: `'${item.word}'는 이미 내 단어에 있어요.` });
      return;
    }
    run(async () => {
      await addCustom(fresh);
      setForm(empty);
      return `'${item.word}' 추가했어요!`;
    });
  }

  function submitBulk() {
    const items = parseBulk(bulk);
    if (items.length === 0) {
      setMsg({ ok: false, text: '한 줄에 하나씩 "단어 - 뜻" 형태로 적어주세요.' });
      return;
    }
    const { fresh, builtin, dup } = split(items);
    run(async () => {
      const added = await addCustom(fresh);
      await Promise.all(builtin.filter((b) => !progress.get(b.id)?.starred).map((b) => toggleStar(b.id)));
      setBulk('');
      setBulkOpen(false);
      const parts = [`${added.length}개 추가했어요.`];
      if (builtin.length) parts.push(`이미 단어장에 있는 ${builtin.length}개는 오답노트에 담았어요.`);
      if (dup.length) parts.push(`중복 ${dup.length}개는 건너뛰었어요.`);
      return parts.join(' ');
    });
  }

  function startEdit(w: Word) {
    setEditing(w.id);
    setForm({ word: w.word, pos: w.pos, meaning: w.meaning, example: w.example });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(w: Word) {
    if (!window.confirm(`'${w.word}'를 지울까요? 학습 기록도 같이 지워져요.`)) return;
    run(async () => {
      await removeCustom(w.id);
      if (editing === w.id) { setEditing(null); setForm(empty); }
      return `'${w.word}' 지웠어요.`;
    });
  }

  const set = (k: keyof CustomInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="font-display text-3xl">내 단어</h1>
          <p className="text-sm text-ink-mute mt-1">직접 추가한 단어는 나만 보여요. 난이도에서 '내 단어'를 고르면 이것만 공부할 수 있어요.</p>
        </div>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{editing ? '단어 수정' : '단어 추가'}</h2>
          {!editing && (
            <button type="button" className="text-sm text-brand font-semibold" onClick={() => { setBulkOpen((o) => !o); setMsg(null); }}>
              {bulkOpen ? '하나씩 추가' : '여러 개 한 번에'}
            </button>
          )}
        </div>

        {bulkOpen && !editing ? (
          <>
            <textarea
              className="input min-h-[160px] font-mono text-sm"
              placeholder={'한 줄에 하나씩 적어주세요\nreimburse - 환급하다\nlogistics: 물류\nquota | 할당량'}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <p className="text-xs text-ink-mute">구분은 하이픈(-), 콜론(:), 세로줄(|), 탭 중 아무거나 쓰면 돼요. 엑셀에서 두 칸 복사해 붙여넣어도 돼요.</p>
            {bulk.trim() && <p className="text-xs text-ink-soft">{parseBulk(bulk).length}개 인식됨</p>}
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={submitBulk}>한 번에 추가</button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input className="input" placeholder="영단어" value={form.word} onChange={set('word')} required maxLength={80} autoCapitalize="off" spellCheck={false} />
              <select className="input w-auto pr-8" value={form.pos} onChange={set('pos')}>
                {POS_OPTIONS.map((p) => <option key={p} value={p}>{p || '품사'}</option>)}
              </select>
            </div>
            <input className="input" placeholder="뜻" value={form.meaning} onChange={set('meaning')} required maxLength={200} />
            <input className="input" placeholder="예문 (선택) — 있으면 철자 퀴즈에서 빈칸 문제로 나와요" value={form.example} onChange={set('example')} maxLength={300} />
            <div className="flex gap-2">
              {editing && (
                <button type="button" className="btn-ghost flex-1" onClick={() => { setEditing(null); setForm(empty); setMsg(null); }}>취소</button>
              )}
              <button className="btn-primary flex-1" disabled={busy}>{editing ? '수정 저장' : '추가하기'}</button>
            </div>
          </>
        )}
        {msg && <p className={`text-sm ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
      </form>

      <div className="flex items-baseline justify-between mt-8 mb-3">
        <h2 className="font-display text-xl">추가한 단어</h2>
        {customWords.length > 0 && (
          <span className="text-sm text-ink-mute">{customWords.length}개</span>
        )}
      </div>

      {!loaded ? (
        <p className="text-ink-mute">불러오는 중…</p>
      ) : customWords.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft">아직 없어요. 시험에서 모르던 단어를 하나씩 모아보세요.</div>
      ) : (
        <>
          <div className="card divide-y-2 divide-paper-line overflow-hidden">
            {[...customWords].reverse().map((w) => (
              <div key={w.id} className={`px-4 py-3 flex items-start gap-3 ${editing === w.id ? 'bg-sunny-soft' : ''}`}>
                <button onClick={() => speak(w.word)} className="text-ink-mute hover:text-brand mt-1"><Volume2 size={16} /></button>
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-display text-lg">{w.word}</span>{' '}
                    {w.pos && <span className="text-xs text-ink-mute">{w.pos}</span>}{' '}
                    <span className="text-ink-soft">{w.meaning}</span>
                  </div>
                  {w.example && <div className="text-xs text-ink-mute mt-0.5 truncate">{w.example}</div>}
                </div>
                <button onClick={() => startEdit(w)} className="p-1.5 rounded-full text-ink-mute hover:bg-paper hover:text-ink" title="수정"><Pencil size={15} /></button>
                <button onClick={() => remove(w)} className="p-1.5 rounded-full text-ink-mute hover:bg-[#ffe3e3] hover:text-bad" title="삭제"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Link to="/study" className="btn-ghost" onClick={() => setLevel('mine')}>내 단어 학습하기</Link>
            <Link to="/quiz" className="btn-primary" onClick={() => setLevel('mine')}>내 단어 퀴즈</Link>
          </div>
        </>
      )}
    </div>
  );
}
