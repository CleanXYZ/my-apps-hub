// 앱별 최근 상황을 GitHub API에서 모아 data/status.json을 만든다.
// GitHub Actions(.github/workflows/pages.yml)가 실행한다. 직접 실행할 때:
//   HUB_TOKEN=... node scripts/collect.mjs
// HUB_TOKEN: 읽기 전용 fine-grained 토큰 (Contents, Issues, Actions, Metadata: Read)

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const TOKEN = process.env.HUB_TOKEN || process.env.GITHUB_TOKEN || '';
const API = 'https://api.github.com';

async function gh(path) {
  const res = await fetch(API + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (res.status === 404) return null; // 저장소나 워크플로가 없다
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

// 배포(Cloudflare)나 빌드(설치 파일) 워크플로 이름
const workflowOf = (app) => (app.deploy ? 'deploy.yml' : app.release?.workflow || null);

async function collectOne(app) {
  const r = app.repo;
  const [commits, issues, runs] = await Promise.all([
    gh(`/repos/${r}/commits?per_page=5`),
    gh(`/repos/${r}/issues?state=open&per_page=20`),
    workflowOf(app) ? gh(`/repos/${r}/actions/workflows/${workflowOf(app)}/runs?per_page=1`) : null,
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
    issues: openIssues.map((i) => ({ number: i.number, title: i.title, url: i.html_url })),
    lastDeploy: run
      ? {
          result: run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'success' : 'failure',
          at: run.updated_at,
          url: run.html_url,
        }
      : null,
  };
}

const apps = JSON.parse(await readFile('apps.json', 'utf8'));
const out = { generatedAt: new Date().toISOString(), apps: {} };

for (const app of apps) {
  try {
    out.apps[app.id] = await collectOne(app);
    console.log(`✓ ${app.id}`);
  } catch (err) {
    console.warn(`! ${app.id}: ${err.message}`); // 한 앱이 실패해도 나머지는 계속한다
    out.apps[app.id] = { error: err.message };
  }
}

await mkdir('data', { recursive: true });
await writeFile('data/status.json', JSON.stringify(out, null, 2) + '\n');
console.log(`status.json: 앱 ${apps.length}개`);
