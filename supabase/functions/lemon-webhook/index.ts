import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const WEBHOOK_SECRET = Deno.env.get('LEMON_WEBHOOK_SECRET')!

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hexSig === signature
}

serve(async (req) => {
  const signature = req.headers.get('x-signature') || ''
  const payload = await req.text()

  // İmza doğrula
  const valid = await verifySignature(payload, signature, WEBHOOK_SECRET)
  if (!valid) {
    console.error('Invalid webhook signature')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(payload)
  const eventName = event.meta?.event_name
  const userId = event.meta?.custom_data?.user_id
  const attributes = event.data?.attributes

  if (!userId) {
    console.error('No user_id in webhook')
    return new Response('No user_id', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  console.log(`Event: ${eventName}, User: ${userId}`)

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const status = attributes?.status // 'active', 'cancelled', 'expired', 'past_due'
    const variantId = String(attributes?.variant_id)
    const plan = variantId === '1356411' ? 'yearly' : 'monthly'
    const endsAt = attributes?.ends_at || attributes?.renews_at
    const trialEndsAt = attributes?.trial_ends_at

    const subscriptionData = {
      user_id: userId,
      status: status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'expired',
      plan,
      current_period_end: endsAt ? new Date(endsAt).toISOString() : null,
      trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      lemon_subscription_id: String(event.data?.id),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })

    if (error) console.error('DB error:', error)

  } else if (eventName === 'subscription_cancelled') {
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)

  } else if (eventName === 'subscription_expired') {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  }

  return new Response('ok', { status: 200 })
})
