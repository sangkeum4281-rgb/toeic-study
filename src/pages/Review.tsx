import { Link } from 'react-router-dom';
import { Star, Volume2 } from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';
import { needsReview, speak } from '../lib/db';

export default function Review() {
  const { progress, loaded, toggleStar, words: allWords } = useProgress();
  const words = allWords
    .filter((w) => needsReview(progress.get(w.id)))
    .sort((a, b) => (progress.get(b.id)!.wrong - progress.get(a.id)!.wrong));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="font-display text-3xl">오답노트</h1>
          <p className="text-sm text-ink-mute mt-1">틀린 단어랑 별표한 단어가 모여요. 두 번 맞히면 졸업!</p>
        </div>
        {words.length > 0 && <Link to="/quiz?from=review" className="btn-primary shrink-0">오답 퀴즈</Link>}
      </div>

      {!loaded ? (
        <p className="text-ink-mute">불러오는 중…</p>
      ) : words.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">
          <p className="font-display text-xl mt-2">오답노트가 텅 비었어요! 최고예요</p>
          <div className="mt-4"><Link to="/" className="btn-ghost">홈으로</Link></div>
        </div>
      ) : (
        <div className="card divide-y-2 divide-paper-line overflow-hidden">
          {words.map((w) => {
            const p = progress.get(w.id)!;
            return (
              <div key={w.id} className="px-4 py-3 flex items-start gap-3">
                <button onClick={() => speak(w.word)} className="text-ink-mute hover:text-brand mt-0.5"><Volume2 size={16} /></button>
                <div className="flex-1 min-w-0">
                  <div><span className="font-display text-lg">{w.word}</span> <span className="text-xs text-ink-mute">{w.pos}</span> <span className="text-ink-soft">{w.meaning}</span></div>
                  <div className="text-xs text-ink-mute mt-0.5 truncate">{w.level === 'advanced' && <span className="chip bg-sunny-soft text-[#c98a00] mr-1 py-0">고급</span>}{w.level === 'mine' && <span className="chip bg-lilac-soft text-lilac mr-1 py-0">내 단어</span>}{w.example}</div>
                </div>
                {p.wrong > 0 && <span className="chip bg-[#ffe3e3] text-bad shrink-0 mt-0.5">틀림 {p.wrong}</span>}
                <button onClick={() => toggleStar(w.id)} title="별표 토글">
                  <Star size={18} className={p.starred ? 'fill-amber-400 text-amber-400' : 'text-ink-mute'} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
