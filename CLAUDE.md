# CLAUDE.md — my-apps-hub

사용자(CleanXYZ)의 모든 앱을 관리하는 허브 저장소다. 작업 전에 이 파일과 `ADDING.md`를 읽는다.

## 규칙
- 이 저장소와 대시보드는 **공개**다. 키, 토큰, 비밀번호, 사내 정보를 어떤 파일에도 넣지 않는다.
- `apps.json`의 `envNames`에는 키 이름만 적는다.
- 내 컴퓨터의 폴더 경로는 `apps.json`에 넣지 않는다. 대시보드가 브라우저(localStorage)에 따로 기억한다.
- `data/status.json`은 Actions가 만든다. 손으로 고치지 않는다.
- 상황 모으기 코드는 `scripts/core.mjs` 하나다. 06:00 갱신(collect.mjs)과 "지금 갱신"(worker/index.js)이 같이 쓴다. 한쪽만 고치지 않는다.
- hub-status Worker는 status.json과 같은 내용만 돌려준다. 그보다 많은 정보(코드 내용, 비밀값)를 돌려주게 바꾸지 않는다.
- "할 일 적기"(POST /issue)는 누구나 쓸 수 있다 (사용자가 정했다). 작성자 이름을 이슈 끝에 남긴다. apps.json에 있는 앱의 저장소에만 쓴다. 이슈 쓰기 열쇠(`HUB_ISSUE_TOKEN`)로 이슈 말고 다른 일을 하게 바꾸지 않는다.
- 앱을 추가하면 `ADDING.md`의 "바뀐 기록"에 예외와 고친 점을 한 줄 적는다.
- 커밋 메시지는 한국어로 짧게 쓴다. 키나 사내 정보를 쓰지 않는다.

## 결정된 것 (계획서 확정안)
- 비공개 저장소도 커밋 메시지와 이슈 제목을 대시보드에 보여 준다.
- 앱별 할 일은 각 앱 저장소의 GitHub Issues에 적는다.
- 카드 버튼은 Claude 중심이다. 직접 편집 버튼(github.dev, Codespaces)은 두지 않는다.
- "Claude에게 맡기기"는 카드 안에 할 일 입력 칸을 연다. 할 일을 맨 위에 둔 문장을 복사한다. 클라우드 앱은 "복사하고 Claude 열기"로 claude.ai/code를 연다.
- 웹의 Claude는 브랜치나 PR 없이 `main`에 바로 push한다 (사용자가 정했다). 테스트가 통과해야 배포된다. 문제가 생기면 `git revert`로 되돌린다.
- Cloudflare 앱은 main에 push하면 자동 배포하고, `workflow_dispatch` 버튼으로도 배포한다.
- 앱 추가는 지금은 Claude가 한다. 절차가 굳으면 Node 명령어 도구 `hub add`로 만든다.
- 회사 업무 도구(바탕화면 `autotest`, `claude` 폴더의 ExcelFinder, QA_GM_Panel 등)는 허브와 GitHub에 올리지 않는다 (사용자가 정했다).
- 커밋 작성자 이메일은 GitHub 숨김 메일(noreply)을 쓴다. 회사 메일을 쓰지 않는다.

## 확인
- 화면을 바꾸면 `npx serve .`로 띄워서 빈 목록, 앱 여러 개, 휴대폰 폭을 확인한다.
