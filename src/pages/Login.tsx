import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

function signUpError(message: string) {
  if (/already registered|already exists/i.test(message)) return '이미 가입된 이메일이에요. 로그인해주세요.';
  if (/password/i.test(message)) return '비밀번호가 너무 약해요. 6자 이상으로 해주세요.';
  if (/invalid.*email|email.*invalid/i.test(message)) return '이메일 주소를 다시 확인해주세요.';
  if (/rate limit|too many/i.test(message)) return '잠시 후 다시 시도해주세요. (요청이 너무 많아요)';
  return message;
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: '이메일이나 비밀번호가 달라요' });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: nickname.trim() } },
      });
      if (error) setMsg({ ok: false, text: signUpError(error.message) });
      // 이메일 확인이 켜져 있으면 Supabase는 이미 가입된 이메일에도 에러 대신 identities가 빈 사용자를 돌려줌
      else if (data.user && data.user.identities?.length === 0) setMsg({ ok: false, text: '이미 가입된 이메일이에요. 로그인해주세요.' });
      else if (!data.session) setMsg({ ok: true, text: '확인 메일을 보냈어요! 메일 속 링크를 누르고 로그인해주세요' });
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl mt-2">
            돼헌이네 <span className="text-brand">토익 단어장</span>
          </h1>
          <p className="text-ink-mute text-sm mt-1">기본부터 고급 단어까지, 같이 외워봐요</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-3">
          <div className="grid grid-cols-2 bg-paper rounded-full p-1 mb-2">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setMsg(null); }}
                className={`py-2 rounded-full font-display transition ${mode === m ? 'bg-white shadow-pop text-ink' : 'text-ink-mute'}`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>
          {mode === 'signup' && (
            <input className="input" placeholder="닉네임 (랭킹에 보여요)" value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={20} />
          )}
          <input className="input" type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {msg && <p className={`text-sm ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? '잠깐만요…' : mode === 'login' ? '공부하러 가기 →' : '가입하고 시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
