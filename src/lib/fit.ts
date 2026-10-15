import { useEffect, useState } from 'react';

/** 글자 너비를 em 단위로 대충 추정 (한글 1em, 영문 소문자 ~0.6em …) */
export function textEm(text: string) {
  let em = 0;
  for (const ch of text) {
    if (/[가-힣ㄱ-ㆎ]/.test(ch)) em += 1;
    else if (/[A-Z]/.test(ch)) em += 0.7;
    else if (/[a-z0-9]/.test(ch)) em += 0.6;
    else if (ch === ' ') em += 0.3;
    else em += 0.4;
  }
  return em;
}

/** 한 줄에 들어가도록 글씨 크기(px)를 계산. base보다 커지지 않고 min보다 작아지지 않음 */
export const fitPx = (text: string, width: number, base: number, min = 12) =>
  Math.max(min, Math.min(base, Math.floor(width / Math.max(textEm(text), 1))));

/** 화면 폭에서 좌우 여백을 뺀, 콘텐츠가 쓸 수 있는 폭 (max는 데스크톱 최대 폭) */
export function useContentWidth(max: number, padding: number) {
  const get = () => Math.min(window.innerWidth - 32, max) - padding;
  const [w, setW] = useState(get);
  useEffect(() => {
    const on = () => setW(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}
