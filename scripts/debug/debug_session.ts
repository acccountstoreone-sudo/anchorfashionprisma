import { loginUser } from "./test_all_logins";

async function main() {
  console.log("--- 1. Testing Admin Access ---");
  const adminLogin = await loginUser("qa_admin@anchorfashion.com", "Password123!");
  const adminCookie = adminLogin.cookies.map(c => c.split(';')[0]).join('; ');
  
  const adminRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: adminCookie },
    redirect: "manual",
  });
  const adminHtml = await adminRes.text();
  console.log("GET /admin Status:", adminRes.status, "Location:", adminRes.headers.get("location"), "Has redirect tag:", adminHtml.includes('__next-page-redirect'));

  console.log("\n--- 2. Testing Manager Access ---");
  const managerLogin = await loginUser("qa_manager@anchorfashion.com", "Password123!");
  const managerCookie = managerLogin.cookies.map(c => c.split(';')[0]).join('; ');
  
  const managerRes = await fetch("http://localhost:3000/manager", {
    headers: { Cookie: managerCookie },
    redirect: "manual",
  });
  const managerHtml = await managerRes.text();
  console.log("GET /manager Status:", managerRes.status, "Location:", managerRes.headers.get("location"), "Has redirect tag:", managerHtml.includes('__next-page-redirect'));

  console.log("\n--- 3. Testing Manager Forbidden from Admin ---");
  const mgrOnAdmin = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: managerCookie },
    redirect: "manual",
  });
  const mgrOnAdminHtml = await mgrOnAdmin.text();
  console.log("Manager accessing /admin Status:", mgrOnAdmin.status, "Location:", mgrOnAdmin.headers.get("location"), "Has redirect tag:", mgrOnAdminHtml.includes('__next-page-redirect'));
  const match = mgrOnAdminHtml.match(/url=([^"'>]+)/);
  if (match) {
    console.log("Manager redirect target:", match[1]);
  }
}

main().catch(console.error);
