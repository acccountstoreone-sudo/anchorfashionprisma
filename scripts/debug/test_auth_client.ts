import { createAuthClient } from "@neondatabase/auth/next";

const authClient = (createAuthClient as any)({
  baseURL: "http://localhost:3000"
});

async function main() {
  console.log("Testing authClient signUp against http://localhost:3000...");
  try {
    const res = await authClient.signUp.email({
      email: "test_customer_qa@example.com",
      password: "TestPassword123!",
      name: "QA Customer",
    });
    console.log("signUp result:", JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error("signUp exception:", e);
  }

  console.log("Testing authClient signIn...");
  try {
    const res = await authClient.signIn.email({
      email: "test_customer_qa@example.com",
      password: "TestPassword123!",
    });
    console.log("signIn result:", JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error("signIn exception:", e);
  }
}

main().catch(console.error);
