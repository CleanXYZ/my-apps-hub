# 앱 추가 절차 (v0.1)

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
   - 이미 GitHub에 있으면 건너뛴다.
   - 없으면 비공개로 만들고 push한다: `gh repo create CleanXYZ/<id> --private --source . --push`
5. **배포 자동화를 넣는다 (Cloudflare 앱만).**
   - Pages: `templates/deploy-pages.yml` → `.github/workflows/deploy.yml`
   - Worker: `templates/deploy-worker.yml` → `.github/workflows/deploy.yml`
   - `__PROJECT__`, `__DIR__`를 바꾼다.
   - 저장소 Secrets에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 넣는다 (사용자가 직접).
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
- `workOn`: `cloud`(어디서나 Claude에게 맡김) | `local`(내 컴퓨터 필요)
- `envNames`: 키 **이름만**. 값은 절대 넣지 않는다. 이 파일은 공개된다.

## 바뀐 기록

- v0.1 (2026-11-24): 처음 만들었다.
