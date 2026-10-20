import { QA_USERS } from './seed_all_qa_roles';

interface LoginResult {
  role: string;
  email: string;
  success: boolean;
  token?: string;
  cookies?: string[];
  user?: any;
  error?: string;
}

export async function loginUser(email: string, password: string):Promise<{ success: boolean; cookies: string[]; user?: any; error?: string }> {
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
    });

    const setCookies = (res.headers as any).getSetCookie?.() || [];
    const body: any = await res.json().catch(() => null);

    if (res.ok && body?.user) {
      return {
        success: true,
        cookies: setCookies,
        user: body.user,
      };
    } else {
      return {
        success: false,
        cookies: [],
        error: body?.message || body?.error || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      cookies: [],
      error: err.message,
    };
  }
}

async function main() {
  console.log("=================================================");
  console.log("       TESTING LOGIN FOR ALL 10 QA ROLES        ");
  console.log("=================================================");

  const results: LoginResult[] = [];

  for (const u of QA_USERS) {
    process.stdout.write(`Testing login for ${u.roleName.padEnd(18)} (${u.email})... `);
    const login = await loginUser(u.email, u.password);
    if (login.success) {
      console.log(`✅ OK (User ID: ${login.user?.id})`);
      results.push({
        role: u.roleName,
        email: u.email,
        success: true,
        user: login.user,
        cookies: login.cookies,
      });
    } else {
      console.log(`❌ FAILED: ${login.error}`);
      results.push({
        role: u.roleName,
        email: u.email,
        success: false,
        error: login.error,
      });
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\nResult: ${successCount}/${QA_USERS.length} accounts logged in successfully.`);
}

if (require.main === module) {
  main().catch(console.error);
}
