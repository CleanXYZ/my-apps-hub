# 앱 추가 절차 (v0.2)

Claude와 나중에 만들 `hub add`는 같은 순서를 따른다.
앱을 추가할 때마다 맨 아래 "바뀐 기록"에 예외와 고친 점을 적는다.
기록이 쌓여 절차가 굳으면, 1~6단계를 `hub add` 도구로 만든다.

## 순서

1. **종류를 알아낸다.**
   - `wrangler.toml` / `wrangler.jsonc`가 있으면 Cloudflare 앱이다. `main`이 있으면 Worker, 없으면 Pages다.
   - `package.json`이 있으면 Node 앱이다.
   - `index.html`만 있으면 정적 페이지다. Cloudflare에 올렸다면 프로젝트 이름을 사용자에게 묻는다.
   - 맞는 규칙이 없으면 사용자에게 묻는다.
2. **키처럼 생긴 글을 찾는다.**
   - `sk-…`, `AKIA…`, `ghp_…`, `api_key = "…"` 같은 글.
   - 찾으면 멈춘다. 값을 `.env`로 옮기고 코드가 `.env`에서 읽게 바꾼 뒤 다시 한다.
   - 이미 커밋된 적 있는 키는 폐기하고 새로 받으라고 사용자에게 알린다.
3. **`.gitignore`와 `.env.example`을 넣는다.**
   - `templates/gitignore`를 `.gitignore`로 복사한다. 이미 있으면 빠진 줄만 더한다.
   - `.env.example`에는 키 이름만 적는다. 값은 비운다.
4. **저장소를 만든다.**
   - **먼저 `gh repo view CleanXYZ/<id>`로 같은 이름이 이미 있는지 확인한다.** 있으면 새로 만들지 않고, `git clone`으로 받아 바탕화면 폴더와 비교한 뒤 합친다.
   - 이미 GitHub에 있으면 건너뛴다.
   - 없으면 비공개로 만들고 push한다: `gh repo create CleanXYZ/<id> --private --source . --push`
5. **배포 자동화를 넣는다 (Cloudflare 앱만).**
   - Pages: `templates/deploy-pages.yml` → `.github/workflows/deploy.yml`
   - Worker: `templates/deploy-worker.yml` → `.github/workflows/deploy.yml`
   - `__PROJECT__`, `__DIR__`를 바꾼다.
   - 저장소 Secrets에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 넣는다 (사용자가 직접).
   - **설치 파일을 만드는 데스크톱 앱(Tauri)**은 `templates/release-tauri.yml` → `.github/workflows/release.yml`, apps.json에 `"release": { "workflow": "release.yml" }`.
   - `.github` 폴더는 원격 도구로 쓸 수 없다. `_setup/`에 넣고 사용자가 명령으로 옮긴다.
6. **`apps.json`에 한 줄을 더한다.**
   - 같은 `id`가 있으면 덮어쓰지 않고 사용자에게 묻는다.
   - 내 컴퓨터에서만 작업할 수 있으면 `workOn: "local"`과 `localReason`을 적는다.
7. **`README.md`와 `CLAUDE.md`를 쓴다.** 이 단계는 늘 Claude가 한다.
   - `templates/README.md`, `templates/CLAUDE.md`를 바탕으로 코드를 읽고 채운다.

## apps.json 한 줄 모양

```json
{
  "id": "coupon-page",
  "name": "쿠폰 이벤트 페이지",
  "summary": "이벤트 기간에 쿠폰을 나눠 주는 페이지",
  "kind": "page",
  "status": "active",
  "repo": "CleanXYZ/coupon-page",
  "url": "https://coupon-page.pages.dev",
  "deploy": { "target": "cf-pages", "project": "coupon-page" },
  "workOn": "cloud",
  "run": "npm run dev",
  "envNames": ["COUPON_API_KEY"],
  "tags": ["이벤트"]
}
```

- `kind`: `page` | `worker` | `program` | `app`
- `status`: `active`(사용 중) | `paused`(보류) | `retired`(폐기)
- `release`: 설치 파일을 만드는 앱만. 허브에 "새 버전 빌드", "설치 파일 받기" 단추가 생긴다
- `workOn`: `cloud`(어디서나 Claude에게 맡김) | `local`(내 컴퓨터 필요)
- `envNames`: 키 **이름만**. 값은 절대 넣지 않는다. 이 파일은 공개된다.

## 자주 막히는 것

- **`.github` 폴더는 원격 도구로 쓸 수 없다.** 워크플로 파일은 `_setup/`에 넣고, 사용자가 `Move-Item`으로 옮긴다. 이미 있는 파일을 바꿀 때는 `Move-Item -Force`.
- **파일을 PC로 보낸 직후에는 예전 내용이 갈 수 있다.** 고친 뒤 몇 초 기다렸다 보내고, 보낸 뒤 PC 쪽 파일 크기가 맞는지 꼭 확인한다.
- **PowerShell에서 `npx`, `npm`이 막힌다** (`npx.ps1을 로드할 수 없습니다`). `npx.cmd`로 쓰거나 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`를 한 번 실행한다.
- **Cloudflare 계정 ID는 `npx wrangler whoami`로 확인한다.** 화면에서 복사하면 다른 ID가 섞이기 쉽다. 틀리면 배포가 `code: 7003`으로 실패한다.
- **Secrets는 `--body "값"`으로 넣는다.** 붙여 넣기보다 공백이 섞일 일이 적다: `gh secret set 이름 -R CleanXYZ/<id> --body "값"`
- **Secrets를 먼저 넣고 나서 push한다.** `gh repo create --source .`(push 없이) → `gh secret set` → `git push -u origin main`
- **Cloudflare 토큰**: "Cloudflare Workers 편집" 정책. 영역 정책은 workers.dev만 쓰면 지워도 된다. 계정 정책은 내 계정을 골라야 한다. IP 필터는 비운다.
- **폴더 이름이 한글이거나 공백이 있으면** 저장소 id는 짧은 영어로 정한다. 폴더 이름은 바꾸지 않아도 된다.
- **새 Worker에 비밀값을 넣을 때는 배포를 먼저 한다.** wrangler-action의 `secrets:`는 명령보다 먼저 돌아서, 아직 없는 Worker에는 실패한다. 배포 단계와 비밀값 단계를 나눈다 (worker.yml 참고).
- **wrangler-action은 `@v4`를 쓴다.** v3은 옛 wrangler(3.90)를 깔고 "Node.js 20 is deprecated" 경고를 낸다. v4는 기본으로 wrangler 4 최신을 쓴다.
- **원본이 없는 Cloudflare Pages는 배포본에서 되찾는다.** `curl.exe -L -o 파일 주소`로 받는다 (PowerShell `Invoke-WebRequest`는 진행 막대 버그로 0바이트가 될 수 있다). 사이트 파일은 `public/`에 둔다.
- **코드에 `/api/...` 호출이 있으면 Pages Functions가 숨어 있다.** Functions 코드는 내려받을 수 없다. 화면만 다시 배포하면 서버 기능이 사라지므로, 먼저 데이터를 백업하고, 바인딩(대시보드 → 설정 → 바인딩)과 KV 키(`npx wrangler kv key list --namespace-id <id> --remote`)를 확인해 `functions/`를 새로 만든다.
- **배포 전에 test 브랜치로 먼저 올려 본다:** `npx wrangler pages deploy public --project-name=<이름> --branch=test` → `https://test.<이름>.pages.dev`에서 확인.
- **Secrets만 고쳤으면** 실패한 배포를 `gh run rerun --failed -R CleanXYZ/<id>`로 다시 돌린다.

## 바뀐 기록

- v0.1 (2026-11-24): 처음 만들었다.
- v0.1 (2026-11-24): 허브 자신(`my-apps-hub`)을 첫 앱으로 등록했다. GitHub Pages로 배포하므로 `deploy` 칸은 비운다.
- v0.1 (2026-11-24): qa-shot 등록. Tauri 데스크톱 앱이라 Cloudflare 대신 `release.yml`(설치 파일 자동 빌드)을 넣었다. `Claude outputs/` 시안은 .gitignore로 뺐다. 기존 README, HISTORY가 좋아서 README에는 자동 빌드 절만 더했다.
- v0.1 (2026-11-24): commute-bus 등록. Worker + assets 앱이라 배포 전에 `npm test`, `npm run build`가 필요했다. package-lock.json이 없어서 `npm ci || npm install`로 설치한다. 키는 .dev.vars라서 `.dev.vars.example`을 만들었다. 이미 Cloudflare에 있는 GBIS_KEY는 그대로 쓴다.
- v0.2 (2026-11-24): commute-bus 첫 배포에서 계정 ID 오류(7003)와 PowerShell 실행 정책을 겪고 "자주 막히는 것"을 만들었다. 템플릿을 Node 22, checkout@v5, setup-node@v5로 올렸다.
- v0.2 (2026-11-24): dictate(음성 받아쓰기) 등록. 폴더 이름이 한글과 공백이라 저장소 id는 영어(`dictate`)로 정했다. 한 저장소에 Python(지금 쓰는 것)과 `dictate-rs/`(옮기는 중) 두 버전을 둔다. dictate-rs README가 없는 release.yml을 설명하고 있어서 "아직 없다"로 고쳤다.
- v0.2 (2026-11-24): 모든 Cloudflare 배포를 wrangler-action@v4로 올렸다 (Node 20 경고 해결).
- v0.2 (2026-11-24): pages.yml을 upload-pages-artifact@v5, deploy-pages@v5로, qa-shot release.yml을 checkout@v5, setup-node@v5, Node 22로 올렸다. 이제 Node 20 경고가 나오는 곳은 남은 외부 부품(tauri-action 등)뿐이다.
- v0.2 (2026-11-24): dictate는 GitHub에 이미 있던 저장소(Rust, 더 새 코드, 빌드 자동화)였다. 바탕화면에서 새로 `git init`해서 사본이 둘이 됐다. GitHub 쪽을 기준으로 Python 버전을 `python/`에 넣어 합쳤다. 빌드가 30분짜리라 `main` push 때는 돌지 않게 고쳤다. 4단계에 "이미 있는지 먼저 확인"을 더했다.
- v0.2 (2026-11-24): mvpbest 등록. 원본이 없어 배포본에서 되찾았다 (React 빌드 파일, 원래 JSX 없음). Pages Functions(`/api/mvp-data`, KV `MVP_KV`의 키 `shared-data`)를 같은 모양으로 새로 만들었다.
