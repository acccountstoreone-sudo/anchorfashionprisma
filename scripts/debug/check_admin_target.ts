import { loginUser } from "./test_all_logins";

async function main() {
  const adminLogin = await loginUser("qa_admin@anchorfashion.com", "Password123!");
  const adminCookie = adminLogin.cookies.map(c => c.split(';')[0]).join('; ');
  
  const adminRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: adminCookie },
  });
  const text = await adminRes.text();
  const metaMatch = text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/i);
  console.log("Admin meta tag:", metaMatch ? metaMatch[0] : "None");
}

main().catch(console.error);
