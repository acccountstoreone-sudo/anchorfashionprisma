import { loginUser } from './test_all_logins';

async function testCustAdmin() {
  const login = await loginUser('qa_customer@anchorfashion.com', 'Password123!');
  console.log('Customer login success:', login.success);
  console.log('Cookies received:', login.cookies);

  const cookieHeader = login.cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Sending Cookie header:', cookieHeader);

  const res = await fetch("http://localhost:3000/admin", {
    headers: {
      Cookie: cookieHeader,
    },
    redirect: 'manual',
  });

  console.log('Response status:', res.status);
  console.log('Response headers:');
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const text = await res.text();
  console.log('Response body preview (first 400 chars):', text.substring(0, 400));
}

testCustAdmin().catch(console.error);
