import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = process.env.FINMATE_BACKEND_URL || 'http://localhost:8080';
const email = process.env.FINMATE_ADMIN_EMAIL;
const password = process.env.FINMATE_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Cần FINMATE_ADMIN_EMAIL và FINMATE_ADMIN_PASSWORD');
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/admin-contract.json', import.meta.url), 'utf8'));
const login = await fetch(`${origin}/api/v1/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email,password}) });
assert.equal(login.status,200,'Đăng nhập Admin thất bại');
const session = (await login.json()).data;
assert.ok(session?.accessToken,'Thiếu access token');
const headers = {authorization:`Bearer ${session.accessToken}`};
const me = await fetch(`${origin}/api/v1/users/me`,{headers});
assert.equal((await me.json()).data?.role,'Admin','Tài khoản không có vai trò Admin');
for (const fixture of fixtures) {
  const response = await fetch(`${origin}${fixture.path}`,{headers});
  assert.equal(response.status,200,`${fixture.path} không trả 200`);
  const envelope = await response.json();
  assert.equal(envelope.success,true,`${fixture.path} success=false`);
  const data = envelope.data;
  assert.equal(Array.isArray(data)?'array':'object',fixture.shape,`${fixture.path} đổi dạng dữ liệu`);
  const item = Array.isArray(data)?data[0]:Array.isArray(data?.items)?data.items[0]:data;
  if (fixture.fields?.length && item) for (const field of fixture.fields) assert.ok(Object.hasOwn(item,field),`${fixture.path} thiếu ${field}`);
  if (fixture.metaFields) for (const field of [fixture.metaFields].flat()) assert.ok(Object.hasOwn(envelope.meta||{},field),`${fixture.path} thiếu meta.${field}`);
}
console.log(`Đạt: đăng nhập Admin và ${fixtures.length} response có xác thực khớp fixture`);
