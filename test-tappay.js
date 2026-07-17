import fetch from "node-fetch";

async function test() {
  const partnerKey = process.env.TAPPAY_PARTNER_KEY || "";
  const isProd = process.env.TAPPAY_ENV === "production";
  console.log("ENV:", process.env.TAPPAY_ENV, "Prod:", isProd);
  
  if (!partnerKey) {
     console.log("No partnet key");
     return;
  }
}

test();
