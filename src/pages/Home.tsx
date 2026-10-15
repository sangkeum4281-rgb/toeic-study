import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, ChevronRight, Flame, GraduationCap, PenLine, Target } from 'lucide-react';
import { LEVEL_LABEL, type LevelFilter } from '../data/words';
import { useProgress } from '../contexts/ProgressContext';
import { useAuth } from '../contexts/AuthContext';
import LevelPicker from '../components/LevelPicker';
import { calcStreak, fetchMyResults, fetchRanking, isMastered, type QuizResult, type RankRow } from '../lib/db';

export const MODE_LABEL: Record<string, string> = { en2ko: '영→뜻', ko2en: '뜻→영', spell: '철자', part5: '파트 5' };
const SOURCE_LABEL: Record<string, string> = { ...LEVEL_LABEL, review: '오답노트' };

export default function Home() {
  const { session, nickname } = useAuth();
  const { progress, level, wordsOf } = useProgress();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);

  useEffect(() => {
    fetchMyResults().then(setResults).catch(console.error);
    fetchRanking().then(setRanking).catch(console.error);
  }, []);

  const pool = wordsOf(level);
  const seen = pool.filter((w) => progress.has(w.id)).length;
  const mastered = pool.filter((w) => isMastered(progress.get(w.id))).length;
  const streak = calcStreak(results);
  const today = new Date().toDateString();
  const todayCount = results.filter((r) => new Date(r.created_at).toDateString() === today).length;
  const totalQ = results.reduce((s, r) => s + r.total, 0);
  const accuracy = totalQ ? Math.round((results.reduce((s, r) => s + r.score, 0) / totalQ) * 100) : 0;

  const message =
    streak >= 7 ? `${streak}일 연속! 진짜 대단해요`
    : streak > 0 ? `${streak}일째 공부 중! 오늘도 화이팅`
    : todayCount > 0 ? '오늘도 왔네요! 한 판 더?'
    : '오늘의 단어 만나러 가볼까요?';

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-ink-mute text-[13px] sm:text-sm whitespace-nowrap truncate">안녕하세요, {nickname}님!</p>
          <h1 className="font-display text-[22px] sm:text-3xl mt-1 whitespace-nowrap">{message}</h1>
        </div>
        <LevelPicker />
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Link to="/study" className="group card p-4 sm:p-6 bg-brand-soft border-brand/30 hover:-translate-y-1 hover:shadow-pop-lg transition flex sm:block items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white grid place-items-center text-brand group-hover:animate-wiggle"><BookOpen /></div>
          <div className="flex-1 min-w-0 sm:mt-3">
            <div className="font-display text-[24px] sm:text-3xl text-brand-dark whitespace-nowrap">학습하기</div>
            <p className="text-ink-soft text-[13px] sm:text-sm whitespace-nowrap">카드 20장씩 넘기며 외우기</p>
          </div>
          <div className="mt-4 btn-primary w-fit py-2 text-[15px] hidden sm:inline-flex">시작하기 →</div>
          <ChevronRight className="sm:hidden text-brand shrink-0" />
        </Link>
        <Link to="/quiz" className="group card p-4 sm:p-6 bg-mint-soft border-mint/40 hover:-translate-y-1 hover:shadow-pop-lg transition flex sm:block items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white grid place-items-center text-mint group-hover:animate-wiggle"><PenLine /></div>
          <div className="flex-1 min-w-0 sm:mt-3">
            <div className="font-display text-[24px] sm:text-3xl text-[#2a9d78] whitespace-nowrap">퀴즈 풀기</div>
            <p className="text-ink-soft text-[13px] sm:text-sm whitespace-nowrap">약한 단어 위주로 10문제</p>
          </div>
          <div className="mt-4 btn py-2 text-[15px] bg-mint text-white hover:bg-[#46b893] hidden sm:inline-flex">도전하기 →</div>
          <ChevronRight className="sm:hidden text-mint shrink-0" />
        </Link>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<Flame size={18} />} tint="bg-sunny-soft text-[#d99a00]" label="연속 학습" value={`${streak}일`} />
        <Stat icon={<GraduationCap size={18} />} tint="bg-lilac-soft text-lilac" label="외운 단어" value={`${mastered}개`} sub={`${LEVEL_LABEL[level]} · 학습 ${seen}개`} />
        <Stat icon={<Target size={18} />} tint="bg-mint-soft text-mint" label="퀴즈 정답률" value={totalQ ? `${accuracy}%` : '–'} />
        <Stat icon={<CalendarCheck size={18} />} tint="bg-brand-soft text-brand" label="오늘 푼 퀴즈" value={`${todayCount}회`} />
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="font-display text-xl whitespace-nowrap">이번 주 랭킹</h2>
            <span className="text-[11px] text-ink-mute whitespace-nowrap">매주 월요일 0시 초기화</span>
          </div>
          <div className="card divide-y-2 divide-paper-line overflow-hidden">
            {ranking.length === 0 && <p className="p-4 text-sm text-ink-mute whitespace-nowrap">아직 기록이 없어요. 1등을 노려보세요!</p>}
            {ranking.map((r, i) => (
              <div key={r.user_id} className={`flex items-center gap-3 px-4 py-2.5 ${r.user_id === session?.user.id ? 'bg-sunny-soft' : ''}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center font-display text-sm shrink-0 ${['bg-sunny text-ink', 'bg-paper-line text-ink', 'bg-[#f3c9a8] text-ink'][i] ?? 'text-ink-mute'}`}>{i + 1}</span>
                <span className="flex-1 truncate">{r.nickname}</span>
                <span className="text-xs text-ink-mute">{r.quizzes}판</span>
                <span className="font-display w-14 text-right">{r.points}점</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl mb-3 whitespace-nowrap">최근 퀴즈</h2>
          <div className="card divide-y-2 divide-paper-line overflow-hidden">
            {results.length === 0 && <p className="p-4 text-sm text-ink-mute whitespace-nowrap">첫 퀴즈를 기다리는 중이에요</p>}
            {results.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 truncate">
                  {SOURCE_LABEL[r.set_id as LevelFilter] ?? r.set_id} · {MODE_LABEL[r.mode] ?? r.mode}
                </span>
                <span className="text-ink-mute">{new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                <span className="font-display w-12 text-right">{r.score}/{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, tint, label, value, sub }: { icon: React.ReactNode; tint: string; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl grid place-items-center ${tint}`}>{icon}</div>
      <div className="text-xs text-ink-mute mt-2 whitespace-nowrap truncate">{label}</div>
      <div className="font-display text-2xl whitespace-nowrap">{value}</div>
      {sub && <div className="text-[11px] text-ink-mute whitespace-nowrap truncate">{sub}</div>}
    </div>
  );
}
