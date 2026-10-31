// End-to-end smoke test for the buyer auth API. Run: node scratch/smoke_auth.mjs
const BASE = process.env.API || 'http://localhost:4000/api/v1/buyer/auth';
const email = `test${Date.now()}@example.com`;
const phone = `9${String(Date.now()).slice(-9)}`;
let pass = 0, fail = 0;

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null, headers: res.headers };
}
function check(name, cond, extra) {
  if (cond) { pass++; console.log('✅', name); } else { fail++; console.log('❌', name, extra ?? ''); }
}

const bad = await call('POST', '/register/', { name: 'A', email: 'x', phone: '123', password: 'short' });
check('register validation 400 + fieldErrors', bad.status === 400 && bad.data.fieldErrors?.email && bad.data.fieldErrors?.password, bad.data);

const reg = await call('POST', '/register/', { name: 'Test Buyer', email, phone, password: 'Secret123' });
check('register 201 verification_required', reg.status === 201 && reg.data.verification_required && reg.data.dev_code, reg.data);
check('CORS header for allowed origin', reg.headers.get('access-control-allow-origin') === 'http://localhost:5173');

const loginUnverified = await call('POST', '/login/', { identifier: email, password: 'Secret123' });
check('login before verify → 403 email_not_verified', loginUnverified.status === 403 && loginUnverified.data.code === 'email_not_verified', loginUnverified.data);

const wrongCode = await call('POST', '/verify-email/', { email, code: '000000' === reg.data.dev_code ? '111111' : '000000' });
check('wrong code → 400 invalid_code', wrongCode.status === 400 && wrongCode.data.code === 'invalid_code', wrongCode.data);

const ver = await call('POST', '/verify-email/', { email, code: reg.data.dev_code });
check('verify-email → user + token', ver.status === 200 && ver.data.token && ver.data.user.email_verified, ver.data);
const token = ver.data.token;

const me = await call('GET', '/me/', null, token);
check('me with token', me.status === 200 && me.data.user.email === email, me.data);

const dup = await call('POST', '/register/', { name: 'Dup', email, phone: '9000000001', password: 'Secret123' });
check('duplicate email → 400', dup.status === 400 && dup.data.fieldErrors?.email, dup.data);

const loginPhone = await call('POST', '/login/', { identifier: phone, password: 'Secret123' });
check('login by phone', loginPhone.status === 200 && loginPhone.data.token, loginPhone.data);

const wrong = await call('POST', '/login/', { identifier: email, password: 'Wrong1234' });
check('wrong password → 401 with attempts left', wrong.status === 401 && /attempts? left/.test(wrong.data.message), wrong.data);

const fr = await call('POST', '/forgot-password/request/', { email });
check('forgot request → dev_code', fr.status === 200 && fr.data.dev_code, fr.data);
const frUnknown = await call('POST', '/forgot-password/request/', { email: 'nobody@example.com' });
check('forgot unknown email → generic 200 (no enumeration)', frUnknown.status === 200 && !frUnknown.data.dev_code, frUnknown.data);
const frAgain = await call('POST', '/forgot-password/request/', { email });
check('resend cooldown → 429', frAgain.status === 429, frAgain.data);

const fv = await call('POST', '/forgot-password/verify/', { email, code: fr.data.dev_code });
check('forgot verify → reset_token', fv.status === 200 && fv.data.reset_token, fv.data);
const same = await call('POST', '/forgot-password/reset/', { email, reset_token: fv.data.reset_token, password: 'Secret123' });
check('reset with same password → 400', same.status === 400, same.data);
const fr2 = await call('POST', '/forgot-password/reset/', { email, reset_token: fv.data.reset_token, password: 'NewSecret456' });
check('reset → 200', fr2.status === 200, fr2.data);
const reuse = await call('POST', '/forgot-password/reset/', { email, reset_token: fv.data.reset_token, password: 'Another789' });
check('reset token single-use', reuse.status === 400, reuse.data);

const meAfter = await call('GET', '/me/', null, token);
check('old sessions revoked after reset', meAfter.status === 401, meAfter.data);

const loginNew = await call('POST', '/login/', { identifier: email, password: 'NewSecret456' });
check('login with new password', loginNew.status === 200, loginNew.data);
const out = await call('POST', '/logout/', null, loginNew.data.token);
check('logout 204', out.status === 204);
const meOut = await call('GET', '/me/', null, loginNew.data.token);
check('token invalid after logout', meOut.status === 401);

for (let i = 0; i < 5; i++) await call('POST', '/login/', { identifier: email, password: 'Nope12345' });
const locked = await call('POST', '/login/', { identifier: email, password: 'NewSecret456' });
check('lockout after 5 failures → 423', locked.status === 423, locked.data);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
