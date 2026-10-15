import basicRaw from './basic.txt?raw';
import advancedRaw from './advanced.txt?raw';

export type Level = 'basic' | 'advanced' | 'mine';
export type LevelFilter = Level | 'all';

export interface Word {
  id: string;
  word: string;
  pos: string;
  meaning: string;
  example: string;
  /** 예문 해석 (내 단어는 없음) */
  exampleKo: string;
  level: Level;
}

function parse(raw: string, level: Level): Word[] {
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const [word, pos, meaning, example, exampleKo = ''] = line.split('|');
      return { id: word.toLowerCase(), word, pos, meaning, example, exampleKo, level };
    });
}

// 파일 순서 = 출제 빈도 순서 (학습하기에서 앞쪽 단어부터 나옴)
export const builtinWords: Word[] = [...parse(basicRaw, 'basic'), ...parse(advancedRaw, 'advanced')];
export const builtinById = new Map(builtinWords.map((w) => [w.id, w]));

export const LEVEL_LABEL: Record<LevelFilter, string> = { all: '전체', basic: '기본', advanced: '고급', mine: '내 단어' };

/** 직접 추가한 단어의 id. 기본 단어 id(소문자 단어)와 겹치지 않게 접두어를 붙임 */
export const customId = (rowId: string) => `c:${rowId}`;
export const isCustomId = (id: string) => id.startsWith('c:');

export const POS_OPTIONS = ['', 'n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'phr.'];
