// Supabase Edge Function: exchange-stars
// Atomic exchange of 100 stars for a Rare character

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const COST = 100

    const { data: profile } = await supabase
      .from('profiles')
      .select('stars_count')
      .eq('id', user.id)
      .single()

    if (!profile || profile.stars_count < COST) {
      return new Response(JSON.stringify({ error: 'Not enough stars', required: COST, current: profile?.stars_count ?? 0 }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pick a random Rare character the user doesn't own
    const { data: owned } = await supabase
      .from('user_characters')
      .select('character_id')
      .eq('user_id', user.id)

    const ownedIds = (owned ?? []).map(o => o.character_id)

    let query = supabase
      .from('characters')
      .select('*')
      .eq('rarity', 'Rare')

    if (ownedIds.length > 0) {
      query = query.not('id', 'in', `(${ownedIds.join(',')})`)
    }

    const { data: available } = await query

    if (!available || available.length === 0) {
      return new Response(JSON.stringify({ error: 'All Rare characters already owned' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const character = available[Math.floor(Math.random() * available.length)]

    // Atomic: deduct stars + add character + log transaction
    await supabase
      .from('profiles')
      .update({ stars_count: profile.stars_count - COST })
      .eq('id', user.id)

    await supabase
      .from('user_characters')
      .insert({ user_id: user.id, character_id: character.id, equipped: false })

    await supabase
      .from('stars_transactions')
      .insert({ user_id: user.id, amount: -COST, reason: `Обмен на персонажа: ${character.name}` })

    return new Response(JSON.stringify({ character, new_balance: profile.stars_count - COST }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
