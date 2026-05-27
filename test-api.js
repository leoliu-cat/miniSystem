fetch("http://localhost:3000/api/auth/send-verification-code", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@example.com" })
}).then(r => r.json()).then(console.log).catch(console.error);
