async function testHttpSignin() {
  const payload = {
    email: "qa_test_admin@anchorfashion.com",
    password: "Password123!",
  };

  console.log("Testing POST to http://localhost:3000/api/auth/sign-in/email...");
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000"
      },
      body: JSON.stringify(payload),
    });

    console.log("Status:", res.status);
    console.log("Set-Cookie headers:", res.headers.getSetCookie?.() || res.headers.get("set-cookie"));
    const text = await res.text();
    console.log("Response:", text);
  } catch (err: any) {
    console.error("Fetch error:", err.message);
  }
}

testHttpSignin();
