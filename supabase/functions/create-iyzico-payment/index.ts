// supabase/functions/create-iyzico-payment/index.ts
// Supabase Edge Functions — deploy: supabase functions deploy create-iyzico-payment
//
// Gerekli environment variables (Supabase Dashboard > Settings > Edge Functions):
//   IYZICO_API_KEY=your_api_key
//   IYZICO_SECRET_KEY=your_secret_key
//   IYZICO_BASE_URL=https://sandbox-api.iyzipay.com (test) veya https://api.iyzipay.com (prod)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateIyzicoAuthHeader(
  apiKey: string,
  secretKey: string,
  requestBody: string
): Promise<string> {
  const randomString = generateRandomString(10);
  const dataToHash = apiKey + randomString + secretKey + requestBody;
  const hash = await hmac("sha256", secretKey, dataToHash, "utf8", "base64");
  return `IYZWS apiKey:${apiKey}, randomKey:${randomString}, signature:${hash}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan, userId, userEmail, userName } = await req.json();

    const apiKey = Deno.env.get("IYZICO_API_KEY")!;
    const secretKey = Deno.env.get("IYZICO_SECRET_KEY")!;
    const baseUrl = Deno.env.get("IYZICO_BASE_URL") || "https://sandbox-api.iyzipay.com";

    const prices: Record<string, string> = {
      monthly: "149.00",
      yearly: "990.00",
    };

    const price = prices[plan] || prices.monthly;
    const conversationId = `lexcalc_${userId}_${Date.now()}`;

    // iyzico CheckoutForm başlat
    const requestBody = {
      locale: "tr",
      conversationId,
      price,
      paidPrice: price,
      currency: "TRY",
      basketId: conversationId,
      paymentGroup: "SUBSCRIPTION",
      callbackUrl: `https://lexcalc.net/payment/callback?userId=${userId}&plan=${plan}`,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: userId,
        name: userName?.split(" ")[0] || "LexCalc",
        surname: userName?.split(" ").slice(1).join(" ") || "Kullanici",
        email: userEmail,
        identityNumber: "11111111111",
        registrationAddress: "Türkiye",
        ip: "85.34.78.112",
        city: "Istanbul",
        country: "Turkey",
      },
      shippingAddress: {
        contactName: userName || "LexCalc Kullanici",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
      },
      billingAddress: {
        contactName: userName || "LexCalc Kullanici",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
      },
      basketItems: [
        {
          id: `lexcalc_${plan}`,
          name: plan === "monthly" ? "LexCalc Aylık Premium" : "LexCalc Yıllık Premium",
          category1: "Yazılım",
          itemType: "VIRTUAL",
          price,
        },
      ],
    };

    const bodyStr = JSON.stringify(requestBody);
    const authHeader = await generateIyzicoAuthHeader(apiKey, secretKey, bodyStr);

    const response = await fetch(`${baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "x-iyzi-rnd": generateRandomString(10),
      },
      body: bodyStr,
    });

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.errorMessage || "iyzico ödeme başlatılamadı");
    }

    // conversationId'yi sakla (callback'te eşleştirme için)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      status: "pending_payment",
      plan,
      iyzico_subscription_ref: conversationId,
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({
        checkoutFormContent: data.checkoutFormContent,
        token: data.token,
        conversationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
