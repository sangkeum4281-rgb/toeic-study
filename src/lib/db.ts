import { supabase } from './supabase';
import { customId, type Word } from '../data/words';

export interface Progress {
  word_id: string;
  correct: number;
  wrong: number;
  starred: boolean;
}

export interface QuizResult {
  id: number;
  set_id: string;
  mode: string;
  score: number;
  total: number;
  created_at: string;
}

export interface RankRow {
  user_id: string;
  nickname: string;
  points: number;
  quizzes: number;
}

export type ProgressMap = Map<string, Progress>;

export const isMastered = (p?: Progress) => !!p && p.correct >= 2 && p.correct >= p.wrong * 2;
// starred: 내 단어 추가 때 이미 있는 단어를 오답노트로 보낸 경우. 두 번 맞히면 다른 단어처럼 졸업
export const needsReview = (p?: Progress) => !!p && (p.starred || p.wrong > 0) && !isMastered(p);

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('로그인이 필요합니다');
  return data.user.id;
}

export async function fetchProgress(): Promise<ProgressMap> {
  const { data, error } = await supabase.from('word_progress').select('word_id, correct, wrong, starred');
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.word_id, r as Progress]));
}

const blank = (wordId: string): Progress => ({ word_id: wordId, correct: 0, wrong: 0, starred: false });

/** 답안을 반영한 새 진행도 (순수 함수 — 화면엔 즉시 반영하고 저장은 따로) */
export function applyAnswers(current: ProgressMap, answers: { wordId: string; correct: boolean }[]) {
  const next = new Map(current);
  for (const a of answers) {
    const p = next.get(a.wordId) ?? blank(a.wordId);
    next.set(a.wordId, { ...p, correct: p.correct + (a.correct ? 1 : 0), wrong: p.wrong + (a.correct ? 0 : 1) });
  }
  return next;
}

export function applyStar(current: ProgressMap, wordId: string) {
  const p = current.get(wordId) ?? blank(wordId);
  return new Map(current).set(wordId, { ...p, starred: !p.starred });
}

export async function saveProgress(rows: Progress[]) {
  if (rows.length === 0) return;
  const user_id = await uid();
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from('word_progress').upsert(rows.map((r) => ({ ...r, user_id, updated_at })));
  if (error) throw error;
}

export async function deleteProgress(wordId: string) {
  const { error } = await supabase.from('word_progress').delete().eq('word_id', wordId);
  if (error) throw error;
}

// ---- 내 단어 ----

export type CustomInput = Pick<Word, 'word' | 'pos' | 'meaning' | 'example'>;

interface CustomRow extends CustomInput {
  id: string;
}

const toWord = (r: CustomRow): Word => ({ ...r, id: customId(r.id), exampleKo: '', level: 'mine' });
const rowId = (id: string) => id.slice(2);

export async function fetchCustomWords(): Promise<Word[]> {
  const { data, error } = await supabase
    .from('custom_words')
    .select('id, word, pos, meaning, example')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(toWord);
}

export async function insertCustomWords(items: CustomInput[]): Promise<Word[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase.from('custom_words').insert(items).select('id, word, pos, meaning, example');
  if (error) throw error;
  return (data ?? []).map(toWord);
}

export async function updateCustomWord(id: string, item: CustomInput): Promise<Word> {
  const { data, error } = await supabase
    .from('custom_words')
    .update(item)
    .eq('id', rowId(id))
    .select('id, word, pos, meaning, example')
    .single();
  if (error) throw error;
  return toWord(data);
}

export async function deleteCustomWord(id: string) {
  const { error } = await supabase.from('custom_words').delete().eq('id', rowId(id));
  if (error) throw error;
}

export async function saveQuizResult(set_id: string, mode: string, score: number, total: number) {
  const user_id = await uid();
  const { error } = await supabase.from('quiz_results').insert({ user_id, set_id, mode, score, total });
  if (error) throw error;
}

export async function fetchMyResults(): Promise<QuizResult[]> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from('quiz_results')
    .select('id, set_id, mode, score, total, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRanking(): Promise<RankRow[]> {
  const { data, error } = await supabase.from('weekly_ranking').select('*');
  if (error) throw error;
  return data ?? [];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** 오늘(또는 어제)부터 거꾸로 퀴즈를 푼 날이 연속된 일수 */
export function calcStreak(results: QuizResult[]) {
  const days = new Set(results.map((r) => dayKey(new Date(r.created_at))));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const weakness = (p?: Progress) => (p ? p.wrong * 2 - p.correct + (p.starred ? 2 : 0) : 0);

/**
 * 학습하기: 복습이 필요한 단어 몇 개 + 아직 안 본 단어를 빈도순으로.
 * 안 본 단어가 없으면 덜 외운 단어 순.
 */
export function pickStudyWords<T extends { id: string }>(pool: T[], progress: ProgressMap, n: number): T[] {
  const review = shuffle(pool.filter((w) => needsReview(progress.get(w.id)))).slice(0, Math.floor(n / 4));
  const fresh = pool.filter((w) => !progress.has(w.id));
  const rest = pool
    .filter((w) => progress.has(w.id) && !review.includes(w) && !isMastered(progress.get(w.id)))
    .sort((a, b) => weakness(progress.get(b.id)) - weakness(progress.get(a.id)));
  return shuffle([...review, ...[...fresh, ...rest].slice(0, n - review.length)]);
}

/** 퀴즈: 이미 본 단어 중 약한 단어 위주, 부족하면 안 본 단어로 채움 */
export function pickQuizWords<T extends { id: string }>(pool: T[], progress: ProgressMap, n: number): T[] {
  const seen = shuffle(pool.filter((w) => progress.has(w.id))).sort(
    (a, b) => Number(isMastered(progress.get(a.id))) - Number(isMastered(progress.get(b.id))) ||
      weakness(progress.get(b.id)) - weakness(progress.get(a.id)),
  );
  const fresh = pool.filter((w) => !progress.has(w.id));
  const picked = [...seen.slice(0, Math.ceil(n * 0.7)), ...fresh.slice(0, n)];
  return shuffle([...picked, ...seen.slice(Math.ceil(n * 0.7))].slice(0, n));
}
