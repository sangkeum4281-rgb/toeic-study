# 돼헌이네 토익 단어장

토익 단어 2,167개를 카드로 외우고 퀴즈로 확인하는 사이트. 계정은 여러 명이 만들 수 있음.

- **학습하기**: 한 번에 20장. 안 본 단어를 빈도순으로 보여주고, 헷갈렸던 단어를 섞어 넣음. 카드마다 알아요/몰라요(→/←) 표시
- **퀴즈 풀기**: 10문제, 3가지 유형(영→뜻, 뜻→영, 철자 쓰기). 공부한 단어 중 약한 단어 위주로 출제
- **난이도**: 기본(1,202) / 고급 990(965) / 전체
- **오답노트**: 틀린 단어와 ⭐ 단어. 2번 이상 맞히면 자동으로 빠짐
- 대시보드: 진도, 연속 학습일, 정답률, 주간 랭킹

## 설정

1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_init.sql` 실행
3. `.env.example`을 `.env`로 복사하고 Project Settings → API의 URL / anon key 입력
4. (선택) Authentication → Providers → Email에서 "Confirm email"을 끄면 가입 즉시 로그인됨
5. `npm install && npm run dev`

## 배포 (Vercel)

환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록한 뒤 배포하면 됨. SPA 라우팅 설정은 `vercel.json`에 있음.

## 단어 데이터

- `src/data/basic.txt`: TOEIC Service List 1.2에서 너무 쉬운 단어(apple, pizza 등)를 뺀 것 + 직접 고른 핵심 단어
- `src/data/advanced.txt`: Business Service List 1.2 중 TSL에 없는 단어에서 토익에 맞는 것만 고름 + 900점대 빈출 어휘 보충
- 형식은 한 줄에 `단어|품사|뜻|예문`. 학습 기록은 단어 자체(소문자)를 id로 저장하므로 순서를 바꿔도 괜찮음. 단, **단어 철자를 고치면 그 단어 기록이 끊김**
- 파일 순서가 곧 "학습하기"에 나오는 순서(빈도순)

출처: TSL·BSL © Browne, C. & Culligan, B. (newgeneralservicelist.com), CC BY-SA 4.0.
이 데이터 파일(한국어 뜻·예문 추가본)도 CC BY-SA 4.0을 따름.
