import { useSyncExternalStore } from 'react';

// 지금 읽고 있는 문장 (없으면 null). 버튼이 "읽는 중"일 때만 색을 바꾸려고 씀
let speaking: string | null = null;
const listeners = new Set<() => void>();
const set = (v: string | null) => {
  speaking = v;
  listeners.forEach((l) => l());
};

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  u.onstart = () => set(text);
  // cancel()로 끊긴 이전 문장의 onend가 새 문장 상태를 지우지 않도록 같은 문장일 때만 해제
  u.onend = u.onerror = () => { if (speaking === text) set(null); };
  set(text); // onstart가 늦게 오거나 안 오는 브라우저(일부 iOS)를 위해 바로 표시
  speechSynthesis.speak(u);
}

export function useSpeaking() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => speaking,
  );
}
