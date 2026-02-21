// Supabase Edge Function: send-sms
// Custom SMS hook that sends OTP codes via Eskiz.uz API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ESKIZ_API = 'https://notify.eskiz.uz/api'

async function getEskizToken(): Promise<string> {
  const email = Deno.env.get('ESKIZ_EMAIL')
  const password = Deno.env.get('ESKIZ_PASSWORD')

  if (!email || !password) {
    throw new Error('ESKIZ_EMAIL and ESKIZ_PASSWORD must be set')
  }

  const formData = new FormData()
  formData.append('email', email)
  formData.append('password', password)

  const res = await fetch(`${ESKIZ_API}/auth/login`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Eskiz auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.data.token
}

async function sendSms(token: string, phone: string, message: string): Promise<void> {
  const from = Deno.env.get('ESKIZ_FROM') || '4546'

  // Eskiz expects phone without '+' prefix
  const cleanPhone = phone.replace(/^\+/, '')

  const formData = new FormData()
  formData.append('mobile_phone', cleanPhone)
  formData.append('message', message)
  formData.append('from', from)

  const res = await fetch(`${ESKIZ_API}/message/sms/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Eskiz send failed (${res.status}): ${text}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate webhook signature from Supabase Auth
    const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')
    if (hookSecret) {
      const payload = await req.text()
      const headers = Object.fromEntries(req.headers)
      const wh = new Webhook(hookSecret)
      try {
        wh.verify(payload, headers)
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Parse the verified payload
      var body = JSON.parse(payload)
    } else {
      var body = await req.json()
    }

    const phone = body.user?.phone
    const otp = body.sms?.otp

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: 'Missing phone or otp' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = await getEskizToken()
    const message = `Amor: Sizning kodingiz: ${otp}. Hech kimga bermang.`
    await sendSms(token, phone, message)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-sms error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
