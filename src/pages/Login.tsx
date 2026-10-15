import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

function signUpError(message: string) {
  if (/already registered|already exists/i.test(message)) return '이미 가입된 이메일이에요';
  if (/password/i.test(message)) return '비밀번호를 6자 이상으로 해주세요';
  if (/invalid.*email|email.*invalid/i.test(message)) return '이메일 주소를 확인해주세요';
  if (/rate limit|too many/i.test(message)) return '요청이 많아요. 잠시 후 다시 해주세요';
  return message;
}

/** 비밀번호 재설정 메일 링크가 돌아올 주소 (GitHub Pages 하위 경로 포함) */
export const RESET_PATH = 'reset-password';
const resetRedirect = () => `${window.location.origin}${import.meta.env.BASE_URL}${RESET_PATH}`;

export default function Login() {
  // 재설정 링크가 만료됐거나 잘못돼서 로그인 없이 돌아온 경우
  const expired = window.location.pathname.endsWith(`/${RESET_PATH}`);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(expired ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    expired ? { ok: false, text: '링크가 만료됐어요. 다시 요청해주세요' } : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirect() });
      // 가입 여부를 알려주지 않도록 성공/실패와 관계없이 같은 안내 (요청 제한만 따로)
      if (error && /rate limit|too many|seconds/i.test(error.message)) setMsg({ ok: false, text: '요청이 많아요. 잠시 후 다시 해주세요' });
      else setMsg({ ok: true, text: '메일을 보냈어요. 스팸함도 확인해주세요' });
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: '이메일이나 비밀번호가 달라요' });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // 지정 안 하면 Supabase Site URL로 돌아가는데, 거기엔 GitHub Pages 하위 경로(/toeic-study/)가 없어 404가 남
        options: { data: { nickname: nickname.trim() }, emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
      });
      if (error) setMsg({ ok: false, text: signUpError(error.message) });
      // 이메일 확인이 켜져 있으면 Supabase는 이미 가입된 이메일에도 에러 대신 identities가 빈 사용자를 돌려줌
      else if (data.user && data.user.identities?.length === 0) setMsg({ ok: false, text: '이미 가입된 이메일이에요' });
      else if (!data.session) setMsg({ ok: true, text: '확인 메일을 보냈어요. 링크를 눌러주세요' });
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-[28px] sm:text-3xl mt-2 whitespace-nowrap">
            돼헌이네 <span className="text-brand">토익 단어장</span>
          </h1>
          <p className="text-ink-mute text-sm mt-1 whitespace-nowrap">기본부터 고급 단어까지, 같이 외워봐요</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-3">
          {mode === 'reset' ? (
            <div className="mb-2">
              <h2 className="font-display text-xl whitespace-nowrap">비밀번호 재설정</h2>
              <p className="text-[13px] text-ink-mute mt-1 whitespace-nowrap">가입한 이메일로 재설정 링크를 보내드려요</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 bg-paper rounded-full p-1 mb-2">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setMsg(null); }}
                className={`py-2 rounded-full font-display whitespace-nowrap transition ${mode === m ? 'bg-white shadow-pop text-ink' : 'text-ink-mute'}`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>
          )}
          {mode === 'signup' && (
            <input className="input" placeholder="닉네임 (랭킹에 보여요)" value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={20} />
          )}
          <input className="input" type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== 'reset' && (
            <input className="input" type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          )}
          {msg && <p className={`text-[13px] whitespace-nowrap ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? '잠깐만요…' : mode === 'login' ? '공부하러 가기 →' : mode === 'signup' ? '가입하고 시작하기' : '재설정 링크 보내기'}
          </button>
          {mode === 'login' && (
            <button type="button" className="block mx-auto text-sm text-ink-mute hover:text-brand" onClick={() => { setMode('reset'); setMsg(null); }}>
              비밀번호를 잊으셨나요?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" className="block mx-auto text-sm text-ink-mute hover:text-brand" onClick={() => { setMode('login'); setMsg(null); }}>
              ← 로그인으로 돌아가기
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
