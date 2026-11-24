// 앱별 최근 상황을 GitHub API에서 모은다.
// 두 곳에서 같이 쓴다:
//   scripts/collect.mjs  — 매일 06:00 Actions가 data/status.json을 만들 때
//   worker/index.js      — 대시보드의 "지금 갱신" 단추 (hub-status Worker)

const API = 'https://api.github.com';

function makeGh(token) {
  return async function gh(path) {
    const res = await fetch(API + path, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'my-apps-hub', // GitHub API는 이 머리글이 없으면 거절한다
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 404) return null; // 저장소나 워크플로가 없다
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return res.json();
  };
}

// 배포(Cloudflare)나 빌드(설치 파일) 워크플로 이름
const workflowOf = (app) => (app.deploy ? 'deploy.yml' : app.release?.workflow || null);

async function collectOne(gh, app) {
  const r = app.repo;
  const wf = workflowOf(app);
  const [commits, issues, runs] = await Promise.all([
    gh(`/repos/${r}/commits?per_page=5`),
    gh(`/repos/${r}/issues?state=open&per_page=20`),
    wf ? gh(`/repos/${r}/actions/workflows/${wf}/runs?per_page=1`) : null,
  ]);

  const recentCommits = (commits || []).map((c) => ({
    sha: c.sha,
    date: c.commit.committer?.date || c.commit.author?.date,
    message: c.commit.message.split('\n')[0],
  }));
  const openIssues = (issues || []).filter((i) => !i.pull_request); // PR은 뺀다
  const run = runs?.workflow_runs?.[0];

  return {
    lastCommit: recentCommits[0] ? { date: recentCommits[0].date, message: recentCommits[0].message } : null,
    recentCommits,
    openIssues: openIssues.length,
    issues: openIssues.map((i) => ({ number: i.number, title: i.title, url: i.html_url, body: (i.body || '').slice(0, 1000) })),
    lastDeploy: run
      ? {
          result: run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'success' : 'failure',
          at: run.updated_at,
          url: run.html_url,
        }
      : null,
  };
}

/** apps.json 목록을 받아 status.json 모양을 돌려준다. 한 앱이 실패해도 나머지는 계속한다. */
export async function collectAll(apps, token, log = () => {}) {
  const gh = makeGh(token);
  const out = { generatedAt: new Date().toISOString(), apps: {} };
  await Promise.all(apps.map(async (app) => {
    try {
      out.apps[app.id] = await collectOne(gh, app);
      log(`✓ ${app.id}`);
    } catch (err) {
      log(`! ${app.id}: ${err.message}`);
      out.apps[app.id] = { error: err.message };
    }
  }));
  return out;
}
