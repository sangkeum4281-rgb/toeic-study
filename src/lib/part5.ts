import type { Word } from '../data/words';

export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function pluralize(w: string) {
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
  return w + 's';
}

/**
 * 예문에 단어가 원형 그대로(명사는 복수형까지) 들어 있으면 빈칸 문장을 만듦.
 * retired처럼 동사가 활용된 문장은 보기도 같이 활용해야 해서 제외 (불규칙 동사 때문에 틀린 보기가 나올 수 있음)
 */
export function blankSentence(w: Word): { sentence: string; plural: boolean } | null {
  if (!w.example || w.word.includes(' ')) return null;
  const base = stripAccents(w.word);
  const alt = w.pos.startsWith('n') ? `|${esc(pluralize(base))}` : '';
  const ex = stripAccents(w.example);
  const m = ex.match(new RegExp(`\\b(${esc(base)}${alt})\\b`, 'i'));
  if (!m || m.index === undefined) return null;
  return {
    sentence: ex.slice(0, m.index) + '-------' + ex.slice(m.index + m[0].length),
    plural: m[0].toLowerCase() !== base.toLowerCase(),
  };
}

// ---- 품사(어형) 문제 ----

export type FormPos = 'n' | 'v' | 'adj' | 'adv';
export const formLabel = (f: Form) => (f.inflected ? '동사 활용형' : FORM_POS_LABEL[f.pos]);
export const FORM_POS_LABEL: Record<FormPos, string> = { n: '명사', v: '동사', adj: '형용사', adv: '부사' };

export interface Form { pos: FormPos; word: string; inflected?: boolean }

/** families.txt: 한 줄에 한 단어 가족. "v:decide n:decision adj:decisive adv:decisively" */
export function parseFamilies(raw: string): Map<string, Form[]> {
  const byWord = new Map<string, Form[]>();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const forms = line.trim().split(/\s+/).map((t) => {
      const [pos, word] = t.split(':');
      return { pos: pos as FormPos, word };
    });
    for (const f of forms) byWord.set(f.word.toLowerCase(), forms);
  }
  return byWord;
}

const posOf = (w: Word): FormPos | null => {
  const p = w.pos.split(/[;,\s]/)[0];
  return p === 'n.' ? 'n' : p === 'v.' ? 'v' : p === 'adj.' ? 'adj' : p === 'adv.' ? 'adv' : null;
};

// 동사 활용형 (실제 토익처럼 -ed/-ing/-s를 오답 보기로 쓰기 위함)
const DOUBLE = new Set(['commit', 'permit', 'refer', 'prefer', 'submit', 'transmit', 'excel', 'occur', 'compel', 'omit', 'equip', 'control', 'admit', 'regret']);
const IRREGULAR = new Set(['grow', 'found']);

function inflect(v: string, kind: 'ed' | 'ing' | 's'): string | null {
  if (IRREGULAR.has(v)) return null;
  const dbl = DOUBLE.has(v) ? v + v.slice(-1) : null;
  if (kind === 's') return pluralize(v);
  if (kind === 'ing') {
    if (dbl) return dbl + 'ing';
    if (/ie$/.test(v)) return v.slice(0, -2) + 'ying';
    if (/[^eioy]e$/.test(v)) return v.slice(0, -1) + 'ing';
    return v + 'ing';
  }
  if (dbl) return dbl + 'ed';
  if (/e$/.test(v)) return v + 'd';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied';
  return v + 'ed';
}

/**
 * 품사 문제: 정답과 같은 가족의 다른 품사 + 동사 활용형으로 보기 4개.
 * - 정답과 같은 품사의 다른 형태(applicant/application 등)는 둘 다 말이 될 수 있어서 뺌
 * - 활용형은 그 자리에 문법적으로 들어갈 수 없는 것만 씀
 *   (형용사 자리엔 reserved 같은 분사가 들어갈 수 있어서 안 씀, 명사 자리엔 동명사가 들어갈 수 있어서 -ing 안 씀)
 */
export function formChoices(w: Word, families: Map<string, Form[]>, sentence?: string): Form[] | null {
  const pos = posOf(w);
  if (!pos) return null;
  const fam = families.get(w.word.toLowerCase());
  if (!fam) return null;
  const self = fam.find((f) => f.word.toLowerCase() === w.word.toLowerCase() && f.pos === pos);
  if (!self) return null;

  const others = fam.filter((f) => f.pos !== pos);
  const verb = fam.find((f) => f.pos === 'v')?.word;
  const kinds: Record<FormPos, ('ed' | 'ing' | 's')[]> = { n: ['ed'], v: ['ing', 's'], adj: ['s'], adv: ['ed', 'ing'] };
  // "a -------" 자리엔 동명사가 못 오니까 -ing도 오답 보기로 쓸 수 있음
  if (pos === 'n' && sentence && /\ban? -------/i.test(sentence)) kinds.n = ['ed', 'ing'];
  const inflected: Form[] = verb
    ? kinds[pos].map((k) => inflect(verb, k)).filter((x): x is string => !!x).map((word) => ({ pos: 'v' as FormPos, word, inflected: true }))
    : [];

  const seen = new Set([self.word.toLowerCase()]);
  const uniq = (list: Form[]) => list.filter((f) => !seen.has(f.word.toLowerCase()) && seen.add(f.word.toLowerCase()));
  // 가족의 다른 품사를 품사별로 하나씩 먼저 → 나머지 가족 → 활용형
  const byPos = new Map<FormPos, Form[]>();
  for (const f of others) byPos.set(f.pos, [...(byPos.get(f.pos) ?? []), f]);
  const first = [...byPos.values()].map((l) => l[Math.floor(Math.random() * l.length)]);
  const picked = uniq([...first, ...others, ...inflected]).slice(0, 3);
  if (picked.length < 3) return null;
  return [self, ...picked];
}
