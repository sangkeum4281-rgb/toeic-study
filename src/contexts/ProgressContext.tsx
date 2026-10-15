import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyAnswers, applyStar, deleteCustomWord, deleteProgress, fetchCustomWords, fetchProgress, insertCustomWords,
  saveProgress, updateCustomWord, type CustomInput, type ProgressMap,
} from '../lib/db';
import { builtinById, builtinWords, isCustomId, type LevelFilter, type Word } from '../data/words';

interface ProgressValue {
  progress: ProgressMap;
  loaded: boolean;
  level: LevelFilter;
  setLevel: (l: LevelFilter) => void;
  record: (answers: { wordId: string; correct: boolean }[]) => Promise<void>;
  toggleStar: (wordId: string) => Promise<void>;
  /** 기본·고급 + 내 단어 */
  words: Word[];
  customWords: Word[];
  wordsOf: (level: LevelFilter) => Word[];
  addCustom: (items: CustomInput[]) => Promise<Word[]>;
  editCustom: (id: string, item: CustomInput) => Promise<void>;
  removeCustom: (id: string) => Promise<void>;
}

const ProgressContext = createContext<ProgressValue | null>(null);

const LEVELS: LevelFilter[] = ['basic', 'advanced', 'mine', 'all'];

const readLevel = (): LevelFilter => {
  try {
    const v = localStorage.getItem('level') as LevelFilter | null;
    if (v && LEVELS.includes(v)) return v;
  } catch { /* 무시 */ }
  return 'basic';
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressMap>(new Map());
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [level, setLevelState] = useState<LevelFilter>(readLevel);
  // 연속으로 빠르게 기록해도 이전 변경을 덮어쓰지 않도록 최신값을 ref로 유지
  const latest = useRef(progress);
  // 불러오기에 실패한 상태에서 저장하면 서버의 기존 기록을 0부터 다시 덮어쓰게 되므로 막음
  const canSave = useRef(false);

  useEffect(() => {
    // 학습 기록과 내 단어는 따로 불러옴: 한쪽이 실패해도(예: 내 단어 테이블이 아직 없음) 다른 쪽은 살아 있게
    Promise.allSettled([fetchProgress(), fetchCustomWords()]).then(([p, c]) => {
      if (p.status === 'rejected') console.error('학습 기록 불러오기 실패', p.reason);
      canSave.current = p.status === 'fulfilled';
      if (c.status === 'rejected') console.error('내 단어 불러오기 실패', c.reason);
      const custom = c.status === 'fulfilled' ? c.value : [];
      const customIds = new Set(custom.map((w) => w.id));
      const rows = p.status === 'fulfilled' ? [...p.value] : [];
      // 단어 목록에서 빠진 예전 id나 지워진 내 단어 기록은 무시
      const valid = rows.filter(([id]) => (isCustomId(id) ? customIds.has(id) : builtinById.has(id)));
      latest.current = new Map([...valid, ...latest.current]);
      setProgress(latest.current);
      setCustomWords(custom);
      setLoaded(true);
    });
  }, []);

  const commit = useCallback(async (next: ProgressMap, ids: string[]) => {
    latest.current = next;
    setProgress(next);
    if (!canSave.current) return;
    await saveProgress([...new Set(ids)].map((id) => next.get(id)!));
  }, []);

  const record = useCallback(
    (answers: { wordId: string; correct: boolean }[]) =>
      commit(applyAnswers(latest.current, answers), answers.map((a) => a.wordId)),
    [commit],
  );

  const toggleStar = useCallback((wordId: string) => commit(applyStar(latest.current, wordId), [wordId]), [commit]);

  const setLevel = (l: LevelFilter) => {
    setLevelState(l);
    try { localStorage.setItem('level', l); } catch { /* 무시 */ }
  };

  const words = useMemo(() => [...builtinWords, ...customWords], [customWords]);
  const wordsOf = useCallback(
    (l: LevelFilter) => (l === 'all' ? words : words.filter((w) => w.level === l)),
    [words],
  );

  const addCustom = useCallback(async (items: CustomInput[]) => {
    const added = await insertCustomWords(items);
    setCustomWords((c) => [...c, ...added]);
    return added;
  }, []);

  const editCustom = useCallback(async (id: string, item: CustomInput) => {
    const updated = await updateCustomWord(id, item);
    setCustomWords((c) => c.map((w) => (w.id === id ? updated : w)));
  }, []);

  const removeCustom = useCallback(async (id: string) => {
    await Promise.all([deleteCustomWord(id), deleteProgress(id)]);
    setCustomWords((c) => c.filter((w) => w.id !== id));
    const next = new Map(latest.current);
    next.delete(id);
    latest.current = next;
    setProgress(next);
  }, []);

  return (
    <ProgressContext.Provider
      value={{ progress, loaded, level, setLevel, record, toggleStar, words, customWords, wordsOf, addCustom, editCustom, removeCustom }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const v = useContext(ProgressContext);
  if (!v) throw new Error('ProgressProvider missing');
  return v;
}
