import { smokeServ, loadServApiKeyAsync } from '../src/serv.js';

const key = await loadServApiKeyAsync();
if (!key) {
  console.log(JSON.stringify({ ok: false, detail: 'key not yet present', source: 'serv-mock' }, null, 2));
  process.exit(0);
}
const r = await smokeServ();
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 2);
