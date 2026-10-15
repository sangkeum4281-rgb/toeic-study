import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { nickname } = useAuth();
  const nav = ({ isActive }: { isActive: boolean }) =>
    `px-2.5 sm:px-3 py-1.5 rounded-full font-display text-[14px] sm:text-[15px] whitespace-nowrap transition ${
      isActive ? 'bg-brand text-white shadow-pop' : 'text-ink-soft hover:bg-brand-soft'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-paper/85 backdrop-blur border-b-2 border-paper-line">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-0.5 sm:gap-1.5">
          <Link to="/" className="flex items-center gap-1.5 mr-auto">
            <span className="font-display text-xl leading-none">
              돼헌이네<span className="text-brand hidden sm:inline"> 토익 단어장</span>
            </span>
          </Link>
          <NavLink to="/" end className={nav}>홈</NavLink>
          <NavLink to="/words" className={nav}>내 단어</NavLink>
          <NavLink to="/review" className={nav}>오답노트</NavLink>
          <span className="text-sm text-ink-mute hidden md:inline ml-2">{nickname}님</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-full text-ink-mute hover:bg-brand-soft hover:text-brand"
            title="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-4xl mx-auto px-4 py-8 text-xs text-ink-mute">
        단어 목록 출처: TOEIC Service List · Business Service List (Browne, C. &amp; Culligan, B.,{' '}
        <a className="underline" href="https://www.newgeneralservicelist.com" target="_blank" rel="noreferrer">newgeneralservicelist.com</a>),{' '}
        <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
        한국어 뜻·예문 추가 및 선별.
      </footer>
    </div>
  );
}
