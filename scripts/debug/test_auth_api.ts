async function testAuth() {
  const url = process.env.NEON_AUTH_BASE_URL || "https://ep-autumn-cake-b45phh1c.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth";
  try {
    const res = await fetch(`${url}/ok`);
    console.log('/ok status:', res.status, await res.text());
  } catch (e: any) {
    console.log('/ok error:', e.message);
  }

  try {
    const res = await fetch(`${url}/.well-known/jwks.json`);
    console.log('jwks status:', res.status, await res.json());
  } catch (e: any) {
    console.log('jwks error:', e.message);
  }
}

testAuth();
