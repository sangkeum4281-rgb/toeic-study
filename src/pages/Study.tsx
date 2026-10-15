import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw, Volume2, X } from 'lucide-react';
import { LEVEL_LABEL, type Word } from '../data/words';
import { useProgress } from '../contexts/ProgressContext';
import { pickStudyWords, speak } from '../lib/db';
import { fitPx, useContentWidth } from '../lib/fit';

const SESSION = 20;

export default function Study() {
  const { progress, loaded, level, record, wordsOf } = useProgress();
  const [words, setWords] = useState<Word[]>([]);
  const [i, setI] = useState(0);
  // 이미 넘긴 카드를 다시 보는 중이면 그 카드 번호 (보기만 하고 표시는 다시 안 함)
  const [view, setView] = useState<number | null>(null);
  const cardWidth = useContentWidth(576, 0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<boolean[]>([]);

  const newSession = () => {
    setWords(pickStudyWords(wordsOf(level), progress, SESSION));
    setI(0);
    setView(null);
    setFlipped(false);
    setMarks([]);
  };

  // 진행도를 다 불러온 뒤, 그리고 난이도가 바뀔 때 새 세션
  useEffect(() => { if (loaded) newSession(); }, [loaded, level, wordsOf]);

  const done = words.length > 0 && i >= words.length;
  const cur = view ?? i;
  const w = words[cur];
  const reviewing = view !== null;

  function goBack() {
    if (cur === 0) return;
    setFlipped(false);
    setView(cur - 1);
  }

  function goForward() {
    if (!reviewing) return;
    setFlipped(false);
    setView(cur + 1 >= i ? null : cur + 1);
  }

  function mark(known: boolean) {
    if (!w || reviewing) return;
    record([{ wordId: w.id, correct: known }]).catch(console.error);
    setMarks((m) => [...m, known]);
    setFlipped(false);
    setI((x) => x + 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !w) return;
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === 'Backspace' || e.key === 'b') goBack();
      else if (reviewing && e.key === 'ArrowRight') goForward();
      else if (reviewing && e.key === 'ArrowLeft') goBack();
      else if (e.key === 'ArrowRight' || e.key === 'o') mark(true);
      else if (e.key === 'ArrowLeft' || e.key === 'x') mark(false);
      else if (e.key === 's') speak(flipped ? w.example || w.word : w.word);
      else if (e.key === 'p') speak(w.word);
      else if (e.key === 'e' && w.example) speak(w.example);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const header = (
    <div className="flex items-center gap-2 mb-6">
      <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-brand-soft"><ArrowLeft size={20} /></Link>
      <h1 className="font-display text-2xl flex-1 whitespace-nowrap">학습하기 <span className="chip bg-sunny-soft text-ink-soft align-middle">{LEVEL_LABEL[level]}</span></h1>
    </div>
  );

  if (!loaded || words.length === 0)
    return (
      <div className="max-w-xl mx-auto">
        {header}
        <div className="card p-6 sm:p-10 text-center">
          <p className="font-display text-xl whitespace-nowrap">
            {!loaded ? '카드 준비 중…' : wordsOf(level).length === 0 ? '아직 추가한 단어가 없어요' : '여기 단어는 다 외웠어요!'}
          </p>
          {loaded && wordsOf(level).length === 0 && <Link to="/words" className="btn-primary mt-4">내 단어 추가하러 가기</Link>}
        </div>
      </div>
    );

  if (done) {
    const known = marks.filter(Boolean).length;
    const unknown = words.filter((_, k) => !marks[k]);
    return (
      <div className="max-w-xl mx-auto">
        {header}
        <div className="card p-8 text-center animate-pop">
          <p className="font-display text-2xl mt-2 whitespace-nowrap">20장 완료! 수고했어요</p>
          <p className="mt-1 text-ink-soft whitespace-nowrap">
            알아요 <b className="text-good">{known}</b> · 다시 보기 <b className="text-bad">{words.length - known}</b>
          </p>
        </div>
        {unknown.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-xl mb-2 whitespace-nowrap">다시 볼 단어</h2>
            <div className="card divide-y-2 divide-paper-line overflow-hidden">
              {unknown.map((u) => (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                  <button onClick={() => speak(u.word)} className="text-ink-mute hover:text-brand"><Volume2 size={16} /></button>
                  <span className="font-semibold whitespace-nowrap">{u.word}</span>
                  <span className="text-ink-soft text-sm flex-1 min-w-0 truncate">{u.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button className="btn-ghost flex-1 whitespace-nowrap" onClick={newSession}><RotateCcw size={16} /> 다음 20개</button>
          <Link to="/quiz" className="btn-primary flex-1 whitespace-nowrap">퀴즈로 확인</Link>
        </div>
      </div>
    );
  }

  const isNew = !progress.has(w.id);

  return (
    <div className="max-w-xl mx-auto">
      {header}
      <div className="flex gap-1 mb-6">
        {words.map((_, k) => (
          <div key={k} className={`h-2.5 flex-1 rounded-full ${
            `${k < marks.length ? (marks[k] ? 'bg-good' : 'bg-bad') : k === i ? 'bg-sunny' : 'bg-paper-line'} ${k === cur && reviewing ? 'ring-2 ring-ink/30' : ''}`
          }`} />
        ))}
      </div>

      <div className="flip-card h-80 cursor-pointer select-none" onClick={() => setFlipped((f) => !f)}>
        <div className={`flip-inner relative h-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-face absolute inset-0 card shadow-pop-lg grid place-items-center p-6">
            <SpeakButton onClick={() => speak(w.word)} title="단어 발음 듣기" />
            <div className="text-center">
              <div className="flex justify-center gap-1.5 mb-3">
                <span className="chip bg-paper text-ink-mute">{w.pos}</span>
                {w.level === 'advanced' && <span className="chip bg-sunny-soft text-[#c98a00]">고급</span>}
                {w.level === 'mine' && <span className="chip bg-lilac-soft text-lilac">내 단어</span>}
                {isNew && <span className="chip bg-brand-soft text-brand-dark">NEW</span>}
              </div>
              <div className="font-display whitespace-nowrap leading-tight" style={{ fontSize: fitPx(w.word, cardWidth - 56, 48, 20) }}>{w.word}</div>
              <div className="text-xs text-ink-mute mt-8 whitespace-nowrap">
                <span className="sm:hidden">탭해서 뒤집기</span>
                <span className="hidden sm:inline">클릭하거나 스페이스바로 뒤집기</span>
              </div>
            </div>
          </div>
          <div className="flip-face flip-back absolute inset-0 card shadow-pop-lg bg-lilac-soft border-lilac/40 grid place-items-center p-8">
            <SpeakButton onClick={() => speak(w.example || w.word)} title="예문 듣기" />
            <div className="text-center">
              <div className="text-sm text-ink-mute mb-1 whitespace-nowrap">{w.word}</div>
              <div className="font-display whitespace-nowrap leading-tight" style={{ fontSize: fitPx(w.meaning, cardWidth - 72, 36, 13) }}>{w.meaning}</div>
              {w.example && (
                <div className="mt-6 bg-white/70 rounded-2xl px-4 py-3">
                  <p className="text-ink-soft italic leading-relaxed text-[14px] sm:text-base">“{w.example}”</p>
                  {w.exampleKo && <p className="mt-1.5 text-ink-mute text-[13px] sm:text-sm leading-relaxed">{w.exampleKo}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {reviewing ? (
        <div className="flex items-center gap-3 mt-4">
          <button className="btn-ghost py-4 px-4" onClick={goBack} disabled={cur === 0} title="이전 카드"><ChevronLeft size={20} /></button>
          <div className={`flex-1 min-w-0 text-center text-[13px] font-semibold whitespace-nowrap ${marks[cur] ? 'text-good' : 'text-bad'}`}>
            {marks[cur] ? '알아요' : '몰라요'}로 표시함
          </div>
          <button className="btn-primary py-4 px-4 whitespace-nowrap" onClick={goForward}>
            {cur + 1 >= i ? '이어서' : '다음'} <ChevronRight size={18} />
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button className="btn py-4 bg-[#ffe3e3] text-bad hover:bg-[#ffd3d3]" onClick={() => mark(false)}>
          <X size={18} /> 몰라요 <span className="text-xs opacity-60 hidden sm:inline">←</span>
        </button>
        <button className="btn py-4 bg-mint-soft text-good hover:bg-[#c9efe0]" onClick={() => mark(true)}>
          <Check size={18} /> 알아요 <span className="text-xs opacity-60 hidden sm:inline">→</span>
        </button>
      </div>
      )}
    </div>
  );
}

/** 카드 오른쪽 위 소리 버튼. 누를 때 카드가 뒤집히지 않게 클릭 전파를 막음 */
function SpeakButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className="absolute top-3 right-3 w-10 h-10 rounded-full grid place-items-center text-ink-mute hover:text-brand hover:bg-white/70 transition"
    >
      <Volume2 size={20} />
    </button>
  );
}
