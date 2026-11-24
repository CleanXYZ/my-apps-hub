// data/status.json을 만든다. GitHub Actions(.github/workflows/pages.yml)가 실행한다.
// 직접 실행할 때: HUB_TOKEN=... node scripts/collect.mjs
// HUB_TOKEN: 읽기 전용 fine-grained 토큰 (Contents, Issues, Actions, Metadata: Read)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { collectAll } from './core.mjs';

const token = process.env.HUB_TOKEN || process.env.GITHUB_TOKEN || '';
const apps = JSON.parse(await readFile('apps.json', 'utf8'));
const out = await collectAll(apps, token, console.log);

await mkdir('data', { recursive: true });
await writeFile('data/status.json', JSON.stringify(out, null, 2) + '\n');
console.log(`status.json: 앱 ${apps.length}개`);
