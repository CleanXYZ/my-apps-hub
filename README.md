# my-apps-hub — 내 앱 허브

지금까지 만든 앱(홈페이지, 프로그램, 앱)을 한곳에서 보고, Claude에게 수정을 맡기고, Cloudflare에 배포하는 대시보드.

- 주소: https://cleanxyz.github.io/my-apps-hub/
- 공개 페이지다. **키, 비밀번호, 사내 정보는 이 저장소에 절대 넣지 않는다.**

## 파일

| 파일 | 하는 일 | 누가 고치나 |
|---|---|---|
| `apps.json` | 앱 목록 | 사람 / Claude |
| `index.html`, `app.js`, `style.css` | 대시보드 화면 | Claude |
| `scripts/collect.mjs` | 앱별 커밋, 이슈, 배포 상태를 모은다 | Claude |
| `.github/workflows/pages.yml` | 상황을 모으고 Pages에 올린다 (push, 매일 06:00, 버튼) | Claude |
| `ADDING.md` | 앱 추가 절차 | Claude가 앱 추가 때마다 고친다 |
| `templates/` | 앱 저장소에 넣을 파일 틀 | Claude |

`data/status.json`은 Actions가 만든다. 저장소에 있는 것은 빈 틀이다.

## 처음 한 번 설정

1. Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets and variables → Actions → `HUB_TOKEN`
   - 읽기 전용 fine-grained 토큰: All repositories, Contents / Issues / Actions / Metadata = Read-only
   - 없으면 공개 저장소 정보만 보인다.

## 앱 추가

Claude에게 "이 폴더 허브에 추가해줘"라고 한다. Claude는 `ADDING.md` 순서를 따른다.

## 로컬에서 미리 보기

```
npx serve .
```
