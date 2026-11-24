// hub-status: 대시보드가 부르는 작은 서버.
// 열쇠는 여기 Cloudflare에만 있다. 대시보드 코드에는 없다.
//   HUB_TOKEN        읽기 전용. 앱별 상황 읽기
//   HUB_ISSUE_TOKEN  이슈 쓰기 전용. 할 일 저장
//
//   GET  /status  → { generatedAt, apps: { <id>: {...} } }   (data/status.json과 같은 모양)
//   POST /issue   ← { app, title, body?, author }  → { number, url }
//                   누구나 쓸 수 있다. 작성자 이름을 이슈 끝에 남긴다.
//                   apps.json에 있는 앱의 저장소에만 쓴다.

import { collectAll } from '../scripts/core.mjs';

const APPS_URL = 'https://raw.githubusercontent.com/CleanXYZ/my-apps-hub/main/apps.json';
const KEEP_MS = 60 * 1000; // 1분 안에 다시 부르면 같은 답을 준다 (GitHub 요청 한도 보호)
const LIMIT = { title: 200, body: 5000, author: 40 };

let cached = null; // { at, body }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors },
  });

async function loadApps() {
  const res = await fetch(`${APPS_URL}?t=${Date.now()}`, { headers: { 'User-Agent': 'my-apps-hub' } });
  if (!res.ok) throw new Error(`apps.json을 못 읽었다 (${res.status})`);
  return res.json();
}

async function getStatus(env) {
  if (cached && Date.now() - cached.at < KEEP_MS) return json(cached.body);
  const out = await collectAll(await loadApps(), env.HUB_TOKEN);
  out.live = true;
  const body = JSON.stringify(out);
  cached = { at: Date.now(), body };
  return json(body);
}

async function createIssue(req, env) {
  if (!env.HUB_ISSUE_TOKEN) return json({ error: '서버에 이슈 쓰기 열쇠(HUB_ISSUE_TOKEN)가 없다' }, 503);

  let input;
  try { input = await req.json(); } catch { return json({ error: '보낸 내용을 읽지 못했다' }, 400); }
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const author = String(input.author || '').trim();
  if (!title) return json({ error: '제목을 적어 주세요' }, 400);
  if (!author) return json({ error: '작성자 이름을 적어 주세요' }, 400);
  if (title.length > LIMIT.title || body.length > LIMIT.body || author.length > LIMIT.author) {
    return json({ error: `너무 길어요 (제목 ${LIMIT.title}자, 내용 ${LIMIT.body}자, 이름 ${LIMIT.author}자까지)` }, 400);
  }

  // apps.json에 있는 앱의 저장소에만 쓴다. 열쇠가 닿는 다른 저장소에는 쓰지 않는다.
  const app = (await loadApps()).find((a) => a.id === input.app);
  if (!app) return json({ error: '허브에 없는 앱이다' }, 404);

  const text = `${body}${body ? '\n\n' : ''}---\n작성: ${author} · 내 앱 허브에서`;
  const res = await fetch(`https://api.github.com/repos/${app.repo}/issues`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'my-apps-hub',
      Authorization: `Bearer ${env.HUB_ISSUE_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ title, body: text }),
  });
  if (!res.ok) return json({ error: `GitHub가 거절했다 (${res.status})` }, 502);
  const issue = await res.json();
  cached = null; // 다음 "지금 갱신"에 바로 보이게
  return json({ number: issue.number, title: issue.title, url: issue.html_url }, 201);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (req.method === 'GET' && url.pathname === '/status') return await getStatus(env);
      if (req.method === 'POST' && url.pathname === '/issue') return await createIssue(req, env);
      return json({ error: '없는 주소다. GET /status, POST /issue를 쓴다' }, 404);
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  },
};
