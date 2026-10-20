import { loginUser } from "./test_all_logins";

async function main() {
  console.log("=== Testing /api/test-role ===");

  // 1. Admin
  const adminLogin = await loginUser("qa_admin@anchorfashion.com", "Password123!");
  const adminCookie = adminLogin.cookies.map(c => c.split(';')[0]).join('; ');
  const adminRes = await fetch("http://localhost:3000/api/test-role", {
    headers: { Cookie: adminCookie },
  });
  console.log("Admin /api/test-role status:", adminRes.status);
  const text = await adminRes.text();
  console.log("Admin /api/test-role body snippet:", text.slice(0, 500));

  // 2. Manager
  const mgrLogin = await loginUser("qa_manager@anchorfashion.com", "Password123!");
  const mgrCookie = mgrLogin.cookies.map(c => c.split(';')[0]).join('; ');
  const mgrRes = await fetch("http://localhost:3000/api/test-role", {
    headers: { Cookie: mgrCookie },
  });
  console.log("Manager /api/test-role response:", await mgrRes.json());

  // 3. Customer
  const custLogin = await loginUser("qa_customer@anchorfashion.com", "Password123!");
  const custCookie = custLogin.cookies.map(c => c.split(';')[0]).join('; ');
  const custRes = await fetch("http://localhost:3000/api/test-role", {
    headers: { Cookie: custCookie },
  });
  console.log("Customer /api/test-role response:", await custRes.json());
}

main().catch(console.error);
