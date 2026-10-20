import { loginUser } from "./test_all_logins";
import { resolveUserRole } from "../lib/auth/server";

async function main() {
  const login = await loginUser("qa_admin@anchorfashion.com", "Password123!");
  console.log("login.user:", login.user);

  const role = await resolveUserRole(login.user);
  console.log("resolveUserRole(login.user):", role);

  const cookieHeader = login.cookies.map(c => c.split(';')[0]).join('; ');
  
  // Call /api/auth/get-session
  const sessRes = await fetch("http://localhost:3000/api/auth/get-session", {
    headers: { Cookie: cookieHeader },
  });
  console.log("GET /api/auth/get-session status:", sessRes.status);
  const sessJson = await sessRes.json().catch(() => null);
  console.log("GET /api/auth/get-session body:", JSON.stringify(sessJson, null, 2));
}

main().catch(console.error);
