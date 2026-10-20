async function testHttpSignup() {
  const payload = {
    email: "qa_test_admin@anchorfashion.com",
    password: "Password123!",
    name: "QA Admin User",
  };

  console.log("Testing POST to http://localhost:3000/api/auth/sign-up/email...");
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000"
      },
      body: JSON.stringify(payload),
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err: any) {
    console.error("Fetch error:", err.message);
  }
}

testHttpSignup();
