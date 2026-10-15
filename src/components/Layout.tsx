import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BookMarked, House, LogOut, NotebookPen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const LINKS = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/words', label: '내 단어', icon: BookMarked, end: false },
  { to: '/review', label: '오답노트', icon: NotebookPen, end: false },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { nickname } = useAuth();
  const topNav = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-full font-display text-[15px] whitespace-nowrap transition ${
      isActive ? 'bg-brand text-white shadow-pop' : 'text-ink-soft hover:bg-brand-soft'
    }`;
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 font-display text-[12px] whitespace-nowrap ${
      isActive ? 'text-brand' : 'text-ink-mute'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-paper/85 backdrop-blur border-b-2 border-paper-line">
        <div className="max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-1.5">
          <Link to="/" className="mr-auto font-display text-[20px] leading-none whitespace-nowrap">
            돼헌이네 <span className="text-brand">토익 단어장</span>
          </Link>
          {/* 데스크톱: 위쪽 메뉴 / 모바일: 아래 탭바 */}
          <nav className="hidden sm:flex items-center gap-1.5">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={topNav}>{l.label}</NavLink>
            ))}
          </nav>
          <span className="text-sm text-ink-mute hidden md:inline ml-2 whitespace-nowrap">{nickname}님</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-full text-ink-mute hover:bg-brand-soft hover:text-brand"
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 sm:py-6">{children}</main>

      <footer className="max-w-4xl mx-auto px-4 pb-28 sm:pb-8 text-[11px] text-ink-mute whitespace-nowrap overflow-hidden text-ellipsis">
        단어 출처:{' '}
        <a className="underline" href="https://www.newgeneralservicelist.com" target="_blank" rel="noreferrer">TSL · BSL</a>
        {' '}© Browne &amp; Culligan ·{' '}
        <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
      </footer>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t-2 border-paper-line flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tab}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
