import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, Volume2, X } from 'lucide-react';
import { LEVEL_LABEL, type Word } from '../data/words';
import { useProgress } from '../contexts/ProgressContext';
import { needsReview, pickQuizWords, saveQuizResult, shuffle, speak, type ProgressMap } from '../lib/db';
import { MODE_LABEL } from './Home';
import { fitPx, useContentWidth } from '../lib/fit';
import familiesRaw from '../data/families.txt?raw';
import { blankSentence, formChoices, formLabel, parseFamilies, pluralize, stripAccents } from '../lib/part5';

const FAMILIES = parseFamilies(familiesRaw);

type Mode = 'en2ko' | 'ko2en' | 'spell' | 'part5';
const QUIZ_LEN = 10;
// 맞히면 이 시간 뒤 다음 문제로 자동으로 넘어감. 틀리면 직접 넘길 때까지 기다림
const NEXT_DELAY = 1500;

interface Option {
  id: string;
  label: string;
  /** 답한 뒤에 보기 옆에 보여줄 설명 (뜻 또는 품사) */
  note?: string;
}

interface Question {
  word: Word;
  options: Option[];
  answerId: string;
  /** 파트 5: 빈칸 뚫린 문장 */
  sentence?: string;
  kind?: 'vocab' | 'form';
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** 예문에서 정답 단어(활용형 포함: retire→retired, apply→applied)를 빈칸으로 */
function blankOut(example: string, word: string) {
  const w = stripAccents(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]');
  const tail = w.endsWith('y') ? 'y|i|ie' : w.endsWith('e') ? 'e?' : '[a-z]?';
  const re = new RegExp(`\\b${w.replace(/(e|y)$/, '')}(?:${tail})[a-z]*`, 'i');
  return stripAccents(example).replace(re, '_____');
}

export const part5Ready = (w: Word) => blankSentence(w) !== null;

function buildQuestions(mode: Mode, pool: Word[], allWords: Word[], progress: ProgressMap): Question[] {
  return pickQuizWords(pool, progress, QUIZ_LEN).map((word) => {
    // 같은 품사·같은 난이도 보기를 우선해서 헷갈리게
    const ok = (w: Word) => w.id !== word.id && w.meaning !== word.meaning && !w.word.includes(' ');
    const similar = shuffle(allWords.filter((w) => ok(w) && w.pos === word.pos && w.level === word.level));
    const samePos = shuffle(allWords.filter((w) => ok(w) && w.pos === word.pos));
    const others = [...similar, ...samePos, ...shuffle(allWords.filter(ok))];
    const choices = shuffle([word, ...[...new Map(others.map((w) => [w.id, w])).values()].slice(0, 3)]);
    if (mode === 'en2ko' || mode === 'ko2en' || mode === 'spell')
      return { word, answerId: word.id, options: choices.map((c) => ({ id: c.id, label: mode === 'en2ko' ? c.meaning : c.word })) };

    const p = blankSentence(word)!;
    // 품사 문제를 낼 수 있는 단어는 반반 섞어서
    const forms = p.plural ? null : formChoices(word, FAMILIES, p.sentence);
    if (forms && Math.random() < 0.5) {
      return {
        word,
        kind: 'form',
        sentence: p.sentence,
        answerId: forms[0].word,
        options: shuffle(forms).map((f) => ({ id: f.word, label: f.word.toLowerCase(), note: formLabel(f) })),
      };
    }
    return {
      word,
      kind: 'vocab',
      sentence: p.sentence,
      answerId: word.id,
      options: choices.map((c) => ({ id: c.id, label: (p.plural ? pluralize(c.word) : c.word).toLowerCase(), note: c.meaning })),
    };
  });
}

export default function Quiz() {
  const [params] = useSearchParams();
  const isReview = params.get('from') === 'review';
  const { progress, loaded, level, record, words: allWords, wordsOf } = useProgress();
  const source = isReview ? 'review' : level;

  const pool = useMemo(
    () => (isReview ? allWords.filter((w) => needsReview(progress.get(w.id))) : wordsOf(level)),
    // 오답노트 풀은 퀴즈 시작 시점 기준으로 고정
    [isReview, level, loaded, wordsOf],
  );

  const [mode, setMode] = useState<Mode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null); // 선택한 word id 또는 입력값
  const [typed, setTyped] = useState('');
  const [answers, setAnswers] = useState<{ wordId: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const cw = useContentWidth(576, 0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 파트 5는 내가 공부한 단어 중 예문이 문제로 쓸 수 있는 것만
  const part5Pool = useMemo(() => pool.filter((w) => progress.has(w.id) && part5Ready(w)), [pool, progress]);

  const start = (m: Mode) => {
    setMode(m);
    setQuestions(buildQuestions(m, m === 'part5' ? part5Pool : pool, allWords, progress));
    setIdx(0);
    setPicked(null);
    setTyped('');
    setAnswers([]);
    setDone(false);
  };

  const q = questions[idx];
  const answered = picked !== null;
  const isCorrect = answered && (mode === 'spell' ? normalize(picked) === normalize(q.word.word) : picked === q.answerId);

  function answer(value: string) {
    if (answered) return;
    setPicked(value);
    const correct = mode === 'spell' ? normalize(value) === normalize(q.word.word) : value === q.answerId;
    setAnswers((a) => [...a, { wordId: q.word.id, correct }]);
    if (mode !== 'ko2en') speak(q.word.word);
  }

  async function next() {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
      setTyped('');
      return;
    }
    setDone(true);
    const score = answers.filter((a) => a.correct).length;
    try {
      await Promise.all([record(answers), saveQuizResult(source, mode!, score, answers.length)]);
    } catch (e) {
      console.error(e);
      alert('결과 저장에 실패했어요. 네트워크를 확인해주세요.');
    }
  }

  useEffect(() => {
    if (mode === 'spell' && !answered) inputRef.current?.focus();
  }, [mode, idx, answered]);

  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!answered || done || !isCorrect) return;
    const t = setTimeout(() => nextRef.current(), NEXT_DELAY);
    return () => clearTimeout(t);
  }, [answered, idx, done, isCorrect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || done) return;
      if (answered && e.key === 'Enter') { e.preventDefault(); next(); }
      else if (!answered && mode !== 'spell') {
        const k = ['1', '2', '3', '4'].indexOf(e.key) >= 0 ? +e.key - 1 : 'abcd'.indexOf(e.key.toLowerCase());
        if (k >= 0 && k < q.options.length) answer(q.options[k].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const title = isReview ? '오답노트 퀴즈' : `퀴즈 · ${LEVEL_LABEL[level]}`;
  const header = (
    <div className="flex items-center gap-2 mb-6">
      <Link to={isReview ? '/review' : '/'} className="p-2 -ml-2 rounded-full hover:bg-brand-soft"><ArrowLeft size={20} /></Link>
      <h1 className="font-display text-[22px] sm:text-2xl flex-1 min-w-0 whitespace-nowrap truncate">{title}</h1>
      {mode && !done && <span className="chip bg-mint-soft text-[#2a9d78] whitespace-nowrap">{MODE_LABEL[mode]}</span>}
    </div>
  );

  if (!loaded) return <div className="max-w-xl mx-auto">{header}<p className="text-ink-mute">불러오는 중…</p></div>;
  if (pool.length === 0)
    return (
      <div className="max-w-xl mx-auto">
        {header}
        <div className="card p-8 text-center text-ink-soft">
          {isReview ? (
            <span className="whitespace-nowrap">오답노트가 텅 비었어요!</span>
          ) : (
            <>
              <span className="whitespace-nowrap">아직 추가한 단어가 없어요</span>
              <div className="mt-4"><Link to="/words" className="btn-primary whitespace-nowrap">내 단어 추가하러 가기</Link></div>
            </>
          )}
        </div>
      </div>
    );

  // 1) 모드 선택
  if (!mode)
    return (
      <div className="max-w-xl mx-auto">
        {header}
        <p className="font-display text-xl mb-4 whitespace-nowrap">어떤 유형으로 풀까요?</p>
        <div className="space-y-3">
          {([
            ['en2ko', 'A → 가', '영어 보고 뜻 고르기', '제일 무난해요', 'bg-brand-soft'],
            ['ko2en', '가 → A', '뜻 보고 영어 고르기', '조금 더 헷갈려요', 'bg-lilac-soft'],
            ['spell', 'Abc', '철자 쓰기', '빈칸에 직접 입력해요', 'bg-sunny-soft'],
            ['part5', 'P5', '토익 파트 5', part5Pool.length > 0 ? '실전처럼 빈칸 채우기' : '학습하기를 먼저 해주세요', 'bg-mint-soft'],
          ] as const).map(([m, icon, label, desc, tint]) => (
            <button key={m} onClick={() => start(m)} disabled={m === 'part5' && part5Pool.length === 0}
              className="card w-full p-4 text-left flex items-center gap-4 hover:-translate-y-0.5 hover:border-brand transition disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-paper-line">
              <span className={`w-14 h-14 rounded-2xl grid place-items-center font-display text-[15px] shrink-0 ${tint}`}>{icon}</span>
              <span>
                <span className="block font-display text-xl whitespace-nowrap">{label}</span>
                <span className="block text-[13px] sm:text-sm text-ink-mute whitespace-nowrap">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );

  // 3) 결과
  if (done) {
    const score = answers.filter((a) => a.correct).length;
    const wrong = questions.filter((_, i) => !answers[i]?.correct).map((x) => x.word);
    const pct = Math.round((score / answers.length) * 100);
    return (
      <div className="max-w-xl mx-auto">
        {header}
        <div className="card p-6 sm:p-8 text-center animate-pop">
          <div className="font-display text-6xl mt-2 whitespace-nowrap">{score}<span className="text-ink-mute text-3xl">/ {answers.length}</span></div>
          <p className="mt-2 font-display text-lg sm:text-xl text-ink-soft whitespace-nowrap">
            {pct === 100 ? '만점이에요! 완벽해요' : pct >= 70 ? '잘했어요! 만점까지 조금만' : '틀린 단어는 오답노트에 쏙'}
          </p>
        </div>
        {wrong.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-xl mb-2 whitespace-nowrap">틀린 단어 <span className="text-ink-mute font-sans text-[13px]">· 오답노트에 담았어요</span></h2>
            <div className="card divide-y-2 divide-paper-line overflow-hidden">
              {wrong.map((w) => (
                <div key={w.id} className="px-4 py-3 flex items-center gap-3">
                  <button onClick={() => speak(w.word)} className="text-ink-mute hover:text-brand"><Volume2 size={16} /></button>
                  <span className="font-semibold whitespace-nowrap">{w.word}</span>
                  <span className="text-ink-soft text-sm flex-1 min-w-0 truncate">{w.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button className="btn-ghost flex-1 whitespace-nowrap" onClick={() => setMode(null)}>다른 유형</button>
          <button className="btn-primary flex-1 whitespace-nowrap" onClick={() => start(mode)}><RotateCcw size={16} /> 한 판 더!</button>
        </div>
      </div>
    );
  }

  // 2) 문제 풀이
  return (
    <div className="max-w-xl mx-auto">
      {header}
      <div className="flex gap-1 mb-6">
        {questions.map((_, i) => (
          <div key={i} className={`h-2.5 flex-1 rounded-full ${
            i < answers.length ? (answers[i].correct ? 'bg-good' : 'bg-bad') : i === idx ? 'bg-sunny' : 'bg-paper-line'
          }`} />
        ))}
      </div>

      <div className={`card shadow-pop-lg p-6 sm:p-8 mb-5 relative ${mode === 'part5' ? 'text-left' : 'text-center'}`}>
        {mode === 'part5' && (
          <>
            <div className="text-xs text-ink-mute mb-3">{idx + 101}.</div>
            <p className="text-[17px] sm:text-xl leading-relaxed font-medium">{q.sentence}</p>
          </>
        )}
        {mode === 'en2ko' && (
          <>
            <span className="chip bg-paper text-ink-mute">{q.word.pos}</span>
            <div className="font-display mt-2 flex items-center justify-center gap-2 whitespace-nowrap" style={{ fontSize: fitPx(q.word.word, cw - 90, 36, 18) }}>
              {q.word.word}
              <button onClick={() => speak(q.word.word)} className="text-ink-mute hover:text-brand"><Volume2 size={20} /></button>
            </div>
          </>
        )}
        {mode === 'ko2en' && (
          <>
            <span className="chip bg-paper text-ink-mute">{q.word.pos}</span>
            <div className="font-display mt-2 whitespace-nowrap" style={{ fontSize: fitPx(q.word.meaning, cw - 60, 36, 13) }}>{q.word.meaning}</div>
          </>
        )}
        {mode === 'spell' && (
          <>
            {q.word.pos && <span className="chip bg-paper text-ink-mute">{q.word.pos}</span>}
            <div className="font-display mt-2 whitespace-nowrap" style={{ fontSize: fitPx(q.word.meaning, cw - 60, 30, 13) }}>{q.word.meaning}</div>
            {q.word.example && <p className="mt-4 text-ink-soft italic bg-paper rounded-2xl px-4 py-3 text-[14px] sm:text-base">“{blankOut(q.word.example, q.word.word)}”</p>}
            <p className="mt-3 text-xs text-ink-mute whitespace-nowrap">힌트: <b>{q.word.word[0]}</b>로 시작하는 {q.word.word.length}글자</p>
          </>
        )}
      </div>

      {mode === 'spell' ? (
        <form onSubmit={(e) => { e.preventDefault(); if (!answered && typed.trim()) answer(typed); }}>
          <input
            ref={inputRef}
            className={`input text-center text-xl font-semibold ${answered ? (isCorrect ? 'border-good bg-mint-soft' : 'border-bad bg-[#ffe3e3] animate-wiggle') : ''}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={answered}
            placeholder="영단어 입력"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
          />
          {!answered && <button className="btn-primary w-full mt-3 whitespace-nowrap">확인!</button>}
        </form>
      ) : (
        <div className="grid gap-2.5">
          {q.options.map((c, i) => {
            const isAns = c.id === q.answerId;
            const isPicked = c.id === picked;
            const style = !answered
              ? 'hover:border-brand hover:bg-brand-soft/50'
              : isAns ? 'border-good bg-mint-soft text-good animate-pop' : isPicked ? 'border-bad bg-[#ffe3e3] text-bad animate-wiggle' : 'opacity-40';
            return (
              <button key={c.id} onClick={() => answer(c.id)} disabled={answered}
                className={`card px-4 py-3.5 text-left flex items-center gap-3 transition active:translate-y-[3px] active:shadow-none ${style}`}>
                <span className="w-7 h-7 rounded-full bg-paper text-ink-mute text-sm font-display grid place-items-center shrink-0">
                  {mode === 'part5' ? 'ABCD'[i] : i + 1}
                </span>
                <span className="font-medium whitespace-nowrap min-w-0 truncate" style={{ fontSize: fitPx(c.label, cw - 110, 16, 12) }}>{c.label}</span>
                <span className="flex-1 min-w-0 text-right text-xs text-ink-mute whitespace-nowrap truncate">{answered && c.note}</span>
                {answered && isAns && <Check size={18} />}
                {answered && isPicked && !isAns && <X size={18} />}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div className="mt-5">
          <div className={`rounded-3xl p-4 border-2 animate-pop ${isCorrect ? 'bg-mint-soft border-mint/40' : 'bg-[#ffe3e3] border-bad/30'}`}>
            <div className={`font-display text-xl whitespace-nowrap ${isCorrect ? 'text-good' : 'text-bad'}`}>
              {isCorrect ? ['정답!', '딩동댕!', '완벽해요', '역시!'][idx % 4] : ['아깝다!', '앗, 다음엔 맞힐 거예요', '괜찮아요'][idx % 3]}
            </div>
            <div className="mt-1 text-sm whitespace-nowrap truncate"><b>{q.word.word}</b> {q.word.pos} {q.word.meaning}</div>
            {q.kind === 'form' && (
              <div className="mt-1 text-sm whitespace-nowrap">
                빈칸에는 <b>{q.options.find((o) => o.id === q.answerId)?.note}</b>가 와야 해요.
              </div>
            )}
            {q.word.example && (
              <div className="mt-1 text-sm text-ink-soft italic flex items-start gap-1.5">
                <span>{q.word.example}</span>
                <button onClick={() => speak(q.word.example)} className="text-ink-mute hover:text-brand shrink-0 mt-0.5" title="예문 듣기"><Volume2 size={15} /></button>
              </div>
            )}
          </div>
          {isCorrect ? (
            <>
              <div className="h-1.5 mt-3 rounded-full bg-paper-line overflow-hidden">
                <div key={idx} className="h-full bg-brand rounded-full" style={{ animation: `drain ${NEXT_DELAY}ms linear forwards` }} />
              </div>
              <button className="btn-ghost w-full mt-3 py-2.5 text-[15px]" onClick={next}>
                {idx + 1 < questions.length ? '바로 다음 문제' : '바로 결과 보기'}<span className="hidden sm:inline text-xs opacity-60">Enter</span>
              </button>
            </>
          ) : (
            <button className="btn-primary w-full mt-3 py-3" onClick={next}>
              {idx + 1 < questions.length ? '확인했어요, 다음 문제' : '결과 보기'}<span className="hidden sm:inline text-xs opacity-70">Enter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
