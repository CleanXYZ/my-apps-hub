// hub-status: 대시보드의 "지금 갱신" 단추가 부르는 작은 서버.
// 비공개 저장소를 읽는 열쇠(HUB_TOKEN)는 여기 Cloudflare에만 있다. 대시보드 코드에는 없다.
// 돌려주는 내용은 data/status.json과 같다 (대시보드에 이미 공개된 정보).
//
//   GET /status  → { generatedAt, apps: { <id>: {...} } }

import { collectAll } from '../scripts/core.mjs';

const APPS_URL = 'https://raw.githubusercontent.com/CleanXYZ/my-apps-hub/main/apps.json';
const KEEP_MS = 60 * 1000; // 1분 안에 다시 부르면 같은 답을 준다 (GitHub 요청 한도 보호)

let cached = null; // { at, body }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors },
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname !== '/status') return json(JSON.stringify({ error: '없는 주소다. /status를 쓴다' }), 404);

    if (cached && Date.now() - cached.at < KEEP_MS) return json(cached.body);

    try {
      // apps.json은 저장소에서 바로 읽는다. Pages가 다시 올라가기 전에도 새 목록이 보인다.
      const res = await fetch(`${APPS_URL}?t=${Date.now()}`, { headers: { 'User-Agent': 'my-apps-hub' } });
      if (!res.ok) throw new Error(`apps.json을 못 읽었다 (${res.status})`);
      const apps = await res.json();
      const out = await collectAll(apps, env.HUB_TOKEN);
      out.live = true;
      const body = JSON.stringify(out);
      cached = { at: Date.now(), body };
      return json(body);
    } catch (err) {
      return json(JSON.stringify({ error: err.message }), 502);
    }
  },
};
