import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/** 재설정 메일 링크로 들어오면 Supabase가 임시 로그인 상태로 만들어줌 → 여기서 새 비밀번호 저장 */
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ ok: false, text: '두 비밀번호가 달라요' });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({
        ok: false,
        text: /different from the old/i.test(error.message)
          ? '예전과 다른 비밀번호로 해주세요'
          : /session|expired|jwt/i.test(error.message)
            ? '링크가 만료됐어요. 다시 요청해주세요'
            : error.message,
      });
    } else {
      setDone(true);
    }
    setBusy(false);
  }

  return (
    <div className="max-w-sm mx-auto mt-6">
      <div className="card p-6">
        <h1 className="font-display text-2xl whitespace-nowrap">새 비밀번호 정하기</h1>
        {done ? (
          <>
            <p className="text-good mt-3 whitespace-nowrap">비밀번호를 바꿨어요!</p>
            <Link to="/" className="btn-primary w-full mt-5">공부하러 가기 →</Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-4">
            <input className="input" type="password" placeholder="새 비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />
            <input className="input" type="password" placeholder="새 비밀번호 한 번 더" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            {msg && <p className={`text-[13px] whitespace-nowrap ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? '잠깐만요…' : '비밀번호 바꾸기'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
