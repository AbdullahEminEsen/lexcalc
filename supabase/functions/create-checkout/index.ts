import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LEMON_API_KEY = Deno.env.get('LEMON_API_KEY')!
const MONTHLY_VARIANT_ID = '1356340'
const YEARLY_VARIANT_ID = '1356411'
const STORE_ID = Deno.env.get('LEMON_STORE_ID') ?? '304204'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth kontrolü
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { plan } = await req.json() // 'monthly' | 'yearly'
    const variantId = plan === 'yearly' ? YEARLY_VARIANT_ID : MONTHLY_VARIANT_ID

    // Lemonsqueezy checkout oluştur
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMON_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
              },
            },
            checkout_options: {
              embed: false,
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: STORE_ID },
            },
            variant: {
              data: { type: 'variants', id: variantId },
            },
          },
        },
      }),
    })

    const data = await response.json()
    const checkoutUrl = data?.data?.attributes?.url

    if (!checkoutUrl) {
      console.error('Checkout error:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Checkout oluşturulamadı' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ url: checkoutUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
