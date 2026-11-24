# CLAUDE.md — my-apps-hub

사용자(CleanXYZ)의 모든 앱을 관리하는 허브 저장소다. 작업 전에 이 파일과 `ADDING.md`를 읽는다.

## 규칙
- 이 저장소와 대시보드는 **공개**다. 키, 토큰, 비밀번호, 사내 정보를 어떤 파일에도 넣지 않는다.
- `apps.json`의 `envNames`에는 키 이름만 적는다.
- 내 컴퓨터의 폴더 경로는 `apps.json`에 넣지 않는다. 대시보드가 브라우저(localStorage)에 따로 기억한다.
- `data/status.json`은 Actions가 만든다. 손으로 고치지 않는다.
- 앱을 추가하면 `ADDING.md`의 "바뀐 기록"에 예외와 고친 점을 한 줄 적는다.
- 커밋 메시지는 한국어로 짧게 쓴다. 키나 사내 정보를 쓰지 않는다.

## 결정된 것 (계획서 확정안)
- 비공개 저장소도 커밋 메시지와 이슈 제목을 대시보드에 보여 준다.
- 앱별 할 일은 각 앱 저장소의 GitHub Issues에 적는다.
- 카드 버튼은 Claude 중심이다. 직접 편집 버튼(github.dev, Codespaces)은 두지 않는다.
- Cloudflare 앱은 main에 push하면 자동 배포하고, `workflow_dispatch` 버튼으로도 배포한다.
- 앱 추가는 지금은 Claude가 한다. 절차가 굳으면 Node 명령어 도구 `hub add`로 만든다.

## 확인
- 화면을 바꾸면 `npx serve .`로 띄워서 빈 목록, 앱 여러 개, 휴대폰 폭을 확인한다.
