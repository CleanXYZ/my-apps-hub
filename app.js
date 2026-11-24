// 내 앱 허브 대시보드
// apps.json(사람이 고친다)과 data/status.json(Actions가 만든다)을 읽어 카드를 그린다.

const KIND_LABEL = { page: 'Page', worker: 'Worker', program: 'Program', app: 'App' };
const STATUS_LABEL = { active: '사용 중', paused: '보류', retired: '폐기' };
const TABS = [['all', '전체'], ['active', '사용 중'], ['paused', '보류'], ['retired', '폐기']];
// "지금 갱신"이 부르는 서버 (worker/index.js). 비공개 저장소 열쇠는 거기에만 있다.
const HUB_API = 'https://hub-status.hunlab.workers.dev';
const LIVE_URL = `${HUB_API}/status`;

const state = { apps: [], status: {}, generatedAt: null, tab: 'all', query: '', open: new Set(), asking: null, writing: null };

// ── 작은 도우미 ─────────────────────────────────────────────
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }

function ago(iso) {
  if (!iso) return '기록 없음';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)}일 전`;
  if (s < 86400 * 60) return `${Math.floor(s / 86400 / 7)}주 전`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400 / 30)}달 전`;
  return `${Math.floor(s / 86400 / 365)}년 전`;
}
function shortDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch { window.prompt('복사해서 쓰세요', text); }
}

// ── 버튼 ───────────────────────────────────────────────────
export function claudePrompt(app, task) {
  const head = `할 일: ${task.trim()}\n\n`;
  if (app.workOn === 'local') {
    return head + [
      `저장소: ${app.repo} (내 컴퓨터에서 해야 하는 앱이다)`,
      `이유: ${app.localReason || '(적혀 있지 않음)'}`,
      '내 컴퓨터의 앱 폴더를 연결할게. 먼저 git pull로 최신을 받아줘.',
      'CLAUDE.md와 README.md를 읽고, 끝나면 커밋하고 push해줘.',
    ].join('\n');
  }
  return head + [
    `저장소: ${app.repo}`,
    '저장소를 받아서 CLAUDE.md와 README.md를 먼저 읽어줘.',
    '끝나면 main에 push해줘. 배포는 자동으로 된다.',
  ].join('\n');
}

// "Claude에게 맡기기" 입력 칸. 쓰는 동안 화면을 다시 그리지 않는다 (글자가 지워지지 않게).
function askPanel(app) {
  const key = `draft:${app.id}`;
  const local = app.workOn === 'local';
  const box = el('textarea', {
    class: 'ask-text', rows: '3',
    placeholder: '무엇을 맡길까요? 예: 설정 화면 맨 아래에 앱 버전을 보여줘',
  });
  box.value = safeGet(key) || '';

  const copyBtn = el('button', { class: 'btn' }, '복사');
  const goBtn = !local && el('button', { class: 'btn pri' }, '복사하고 Claude 열기');
  const sync = () => {
    const empty = !box.value.trim();
    copyBtn.disabled = empty;
    if (goBtn) goBtn.disabled = empty;
  };
  sync();
  box.addEventListener('input', () => { safeSet(key, box.value); sync(); });

  const doCopy = async (open) => {
    if (!box.value.trim()) { box.focus(); return; }
    await copy(claudePrompt(app, box.value),
      local ? '복사했어요. Claude 데스크톱 앱에 붙여 넣고 앱 폴더를 연결하세요' : '복사했어요. Claude에 붙여 넣고 보내세요');
    if (open) {
      window.open('https://claude.ai/code', '_blank', 'noopener');
      safeSet(key, '');
      state.asking = null;
      render();
    }
  };
  copyBtn.addEventListener('click', () => doCopy(false));
  if (goBtn) goBtn.addEventListener('click', () => doCopy(true));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doCopy(!local); }
    if (e.key === 'Escape') { state.asking = null; render(); }
  });

  return el('div', { class: 'ask' },
    box,
    el('div', { class: 'ask-row' },
      goBtn, copyBtn,
      el('button', { class: 'btn ghost', onclick: () => { state.asking = null; render(); } }, '닫기'),
      el('span', { class: 'muted' }, local
        ? 'Ctrl+Enter 복사 · 내 컴퓨터 작업 앱이라 Claude 데스크톱 앱에서 한다'
        : 'Ctrl+Enter 복사하고 열기 · 쓰던 글은 이 브라우저에 남는다'),
    ),
  );
}

function localButton(app) {
  const key = `path:${app.id}`;
  const path = safeGet(key);
  if (!path) {
    return el('button', { class: 'btn', onclick: () => {
      const p = window.prompt(`이 컴퓨터에서 ${app.name} 폴더 경로를 적어 주세요.\n예: C:\\Users\\User\\Desktop\\${app.id}`);
      if (p && p.trim()) { safeSet(key, p.trim()); render(); toast('이 브라우저에 경로를 기억했어요'); }
    } }, '내 폴더 등록');
  }
  const href = `vscode://file/${path.replaceAll('\\', '/')}`;
  return el('a', { class: 'btn', href, title: `${path}\n(Shift+클릭하면 저장한 경로를 지워요)`,
    onclick: (e) => {
      if (e.shiftKey) { e.preventDefault(); safeSet(key, ''); render(); toast('경로를 지웠어요'); }
    } }, '내 폴더');
}

function buildButtons(app) {
  const r = app.repo;
  const local = app.workOn === 'local';
  return [
    el('button', { class: 'btn pri', 'aria-expanded': String(state.asking === app.id), onclick: () => {
      state.asking = state.asking === app.id ? null : app.id;
      render();
      document.querySelector('.ask-text')?.focus();
    } }, 'Claude에게 맡기기'),
    app.deploy && el('a', { class: 'btn', href: `https://github.com/${r}/actions/workflows/deploy.yml`, target: '_blank', rel: 'noopener' }, '새 버전 배포'),
    app.release && el('a', { class: 'btn', href: `https://github.com/${r}/actions/workflows/${app.release.workflow}`, target: '_blank', rel: 'noopener' }, '새 버전 빌드'),
    app.release && el('a', { class: 'btn', href: `https://github.com/${r}/releases/latest`, target: '_blank', rel: 'noopener' }, '설치 파일 받기'),
    app.url && el('a', { class: 'btn', href: app.url, target: '_blank', rel: 'noopener' }, '사이트 열기'),
    el('a', { class: 'btn', href: `https://github.com/${r}`, target: '_blank', rel: 'noopener' }, '저장소'),
    local && el('button', { class: 'btn', onclick: () => copy(`git clone https://github.com/${r}.git`, 'git clone 명령을 복사했어요') }, '내려받기 명령 복사'),
    local && localButton(app),
  ].filter(Boolean);
}

// ── 카드 ───────────────────────────────────────────────────
function deployBadge(app, st) {
  const d = st?.lastDeploy;
  if (!d) return null;
  const word = app.release ? '빌드' : '배포';
  if (d.result === 'success') return el('span', { class: 'ok' }, `● ${word}됨 · ${ago(d.at)}`);
  if (d.result === 'failure') return el('a', { class: 'bad', href: d.url, target: '_blank', rel: 'noopener' }, `✕ ${word} 실패 · 로그 보기`);
  return el('span', { class: 'run' }, `◐ ${word} 중`);
}

// "+ 할 일 적기" 입력 칸. 저장하면 hub-status 서버가 그 앱 저장소에 이슈를 만든다.
// 누구나 쓸 수 있고, 작성자 이름이 이슈 끝에 남는다. 쓰는 동안 화면을 다시 그리지 않는다.
function writePanel(app) {
  const who = el('input', { class: 'write-author', type: 'text', maxlength: '40', placeholder: '작성자 이름' });
  who.value = safeGet('author') || '';
  const title = el('input', { class: 'write-title', type: 'text', maxlength: '200', placeholder: '할 일 제목 (예: 모바일에서 버튼이 잘린다)' });
  const body = el('textarea', { class: 'write-body', rows: '3', maxlength: '5000', placeholder: '내용 (선택)' });
  const save = el('button', { class: 'btn pri' }, '저장');
  const sync = () => { save.disabled = !title.value.trim() || !who.value.trim(); };
  [who, title].forEach((x) => x.addEventListener('input', sync));
  sync();

  const close = () => { state.writing = null; render(); };
  const submit = async () => {
    if (save.disabled) return;
    save.disabled = true;
    save.textContent = '저장 중…';
    safeSet('author', who.value.trim());
    try {
      const res = await fetch(`${HUB_API}/issue`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app: app.id, title: title.value, body: body.value, author: who.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.status);
      // 목록에 바로 더한다. 다음 갱신 때 GitHub 내용으로 맞춰진다.
      const st = (state.status[app.id] ||= { issues: [], openIssues: 0 });
      st.issues = [{ number: data.number, title: data.title, url: data.url }, ...(st.issues || [])];
      st.openIssues = (st.openIssues || 0) + 1;
      toast(`할 일 #${data.number}을 저장했어요`);
      close();
    } catch (err) {
      toast(`저장하지 못했어요 (${err.message})`);
      save.disabled = false;
      save.textContent = '저장';
    }
  };
  save.addEventListener('click', submit);
  [title, body].forEach((x) => x.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') close();
  }));

  return el('div', { class: 'write' },
    title, body,
    el('div', { class: 'ask-row' },
      who, save,
      el('button', { class: 'btn ghost', onclick: close }, '취소'),
      el('a', { class: 'muted', href: `https://github.com/${app.repo}/issues/new`, target: '_blank', rel: 'noopener' }, 'GitHub에서 적기'),
    ),
  );
}

function detail(app, st) {
  const commits = st?.recentCommits || [];
  const issues = st?.issues || [];
  return el('div', { class: 'detail' },
    el('section', {},
      el('h3', {}, '최근 커밋'),
      commits.length
        ? el('ul', {}, commits.map((c) => el('li', {},
            el('span', { class: 'd' }, shortDate(c.date)),
            el('a', { href: `https://github.com/${app.repo}/commit/${c.sha}`, target: '_blank', rel: 'noopener' }, c.message),
            el('span', { class: 'sha' }, c.sha.slice(0, 7)))))
        : el('p', { class: 'muted' }, '아직 모은 기록이 없어요.'),
    ),
    el('section', {},
      el('h3', {}, `할 일 (열린 이슈 ${issues.length}개)`),
      issues.length
        ? el('ul', {}, issues.map((i) => el('li', {},
            el('span', { class: 'd' }, `#${i.number}`),
            el('a', { href: i.url, target: '_blank', rel: 'noopener' }, i.title))))
        : el('p', { class: 'muted' }, '열린 할 일이 없어요.'),
      state.writing === app.id
        ? writePanel(app)
        : el('p', {}, el('button', { class: 'btn', onclick: () => {
            state.writing = app.id;
            render();
            document.querySelector('.write-title')?.focus();
          } }, '+ 할 일 적기')),
    ),
  );
}

function card(app) {
  const st = state.status[app.id];
  const isOpen = state.open.has(app.id);
  const kindTag = app.deploy ? el('span', { class: 'tag cf' }, app.deploy.target === 'cf-worker' ? 'CF Worker' : 'CF Pages')
                             : el('span', { class: 'tag' }, KIND_LABEL[app.kind] || app.kind);
  return el('article', { class: 'card' },
    el('div', { class: 'body' },
      el('div', { class: 'head' },
        el('span', { class: 'name' }, app.name),
        kindTag,
        app.workOn === 'local' && el('span', { class: 'tag', title: app.localReason || '' }, '내 컴퓨터 작업'),
        (app.tags || []).map((t) => el('span', { class: 'tag' }, `#${t}`)),
        el('span', { class: `st ${app.status}` }, STATUS_LABEL[app.status] || app.status),
      ),
      app.summary && el('p', { class: 'summary' }, app.summary),
      el('div', { class: 'meta' },
        el('span', {}, `커밋 ${ago(st?.lastCommit?.date)}`),
        el('span', {}, `할 일 ${st?.openIssues ?? '-'}`),
        deployBadge(app, st),
        app.run && el('span', {}, '실행 ', el('code', {}, app.run)),
        app.envNames?.length && el('span', {}, '키 ', app.envNames.map((n) => el('code', {}, n))),
      ),
    ),
    el('div', { class: 'btns' },
      buildButtons(app),
      el('button', { class: 'btn more', 'aria-expanded': String(isOpen), onclick: () => {
        isOpen ? state.open.delete(app.id) : state.open.add(app.id);
        render();
      } }, isOpen ? '접기 ▲' : '자세히 보기 ▼'),
    ),
    state.asking === app.id && askPanel(app),
    isOpen && detail(app, st),
  );
}

// ── 화면 전체 ───────────────────────────────────────────────
function matches(app) {
  if (state.tab !== 'all' && app.status !== state.tab) return false;
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return [app.name, app.id, app.summary, ...(app.tags || [])].join(' ').toLowerCase().includes(q);
}

function render() {
  const counts = { all: state.apps.length };
  for (const a of state.apps) counts[a.status] = (counts[a.status] || 0) + 1;

  document.getElementById('summary').textContent =
    `${state.apps.length}개` + (state.generatedAt ? ` · ${ago(state.generatedAt)} 갱신` : '');

  const tabs = document.getElementById('tabs');
  tabs.replaceChildren(...TABS.map(([key, label]) => el('button', {
    'aria-pressed': String(state.tab === key),
    onclick: () => { state.tab = key; safeSet('tab', key); render(); },
  }, `${label} ${counts[key] || 0}`)));

  const list = document.getElementById('list');
  const shown = state.apps.filter(matches);
  if (!state.apps.length) {
    list.replaceChildren(el('div', { class: 'empty' },
      el('p', {}, el('b', {}, '아직 등록한 앱이 없어요.')),
      el('p', {}, 'Claude에게 “이 폴더 허브에 추가해줘”라고 하면 ADDING.md 순서대로 등록해요.')));
  } else if (!shown.length) {
    list.replaceChildren(el('div', { class: 'empty' }, '조건에 맞는 앱이 없어요.'));
  } else {
    list.replaceChildren(...shown.map(card));
  }

  document.getElementById('footer').textContent = state.generatedAt
    ? `상황 정보: ${new Date(state.generatedAt).toLocaleString('ko-KR')} 기준 · 매일 06:00 자동 갱신 · ↻로 바로 갱신`
    : '상황 정보는 GitHub Actions가 매일 06:00에 모아요.';
}

async function refreshLive() {
  const btn = document.getElementById('refresh');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '↻ 갱신 중…';
  try {
    const res = await fetch(LIVE_URL, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || res.status);
    state.status = data.apps || {};
    state.generatedAt = data.generatedAt;
    render();
    toast('모든 앱을 새로 읽었어요');
  } catch (err) {
    toast(`갱신하지 못했어요 (${err.message}). 잠시 뒤 다시 눌러 주세요`);
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ 지금 갱신';
  }
}

async function load() {
  state.tab = safeGet('tab') || 'all';
  document.getElementById('search').addEventListener('input', (e) => { state.query = e.target.value; render(); });
  document.getElementById('refresh').addEventListener('click', refreshLive);

  const [apps, status] = await Promise.all([
    fetch('apps.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    fetch('data/status.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
  ]);
  state.apps = Array.isArray(apps) ? apps : [];
  state.status = status.apps || {};
  state.generatedAt = status.generatedAt || null;
  render();
}

load();
