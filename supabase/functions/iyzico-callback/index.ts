// supabase/functions/iyzico-callback/index.ts
// deploy: supabase functions deploy iyzico-callback
// Bu fonksiyon iyzico'nun ödeme sonucu POST ettiği webhook endpoint'i

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const formData = await req.formData();
    const token = formData.get("token")?.toString();
    const userId = new URL(req.url).searchParams.get("userId");
    const plan = new URL(req.url).searchParams.get("plan") || "monthly";

    if (!token || !userId) {
      return new Response("Missing token or userId", { status: 400 });
    }

    const apiKey = Deno.env.get("IYZICO_API_KEY")!;
    const secretKey = Deno.env.get("IYZICO_SECRET_KEY")!;
    const baseUrl = Deno.env.get("IYZICO_BASE_URL") || "https://sandbox-api.iyzipay.com";

    // Token ile ödeme sonucunu sorgula
    const checkBody = JSON.stringify({ locale: "tr", token });
    const response = await fetch(`${baseUrl}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `IYZWS apiKey:${apiKey}, randomKey:rnd${Date.now()}, signature:`,
      },
      body: checkBody,
    });

    const result = await response.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (result.paymentStatus === "SUCCESS") {
      const now = new Date();
      const periodEnd = plan === "yearly"
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        status: "active",
        plan,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        iyzico_subscription_ref: result.basketId,
      }, { onConflict: "user_id" });

      // Başarı sayfasına yönlendir
      return new Response(null, {
        status: 302,
        headers: { Location: "lexcalc://payment-success" },
      });
    } else {
      // Başarısız — trial'a geri dön
      await supabase.from("subscriptions").update({
        status: "trial",
      }).eq("user_id", userId);

      return new Response(null, {
        status: 302,
        headers: { Location: "lexcalc://payment-failed" },
      });
    }
  } catch (error: any) {
    console.error("Callback error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
