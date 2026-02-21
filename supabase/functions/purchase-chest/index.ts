// Supabase Edge Function: purchase-chest
// Server-side validation for character chest purchases

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

    const { collection_id } = await req.json()

    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('collection_id', collection_id)

    if (!characters || characters.length === 0) {
      return new Response(JSON.stringify({ error: 'No characters in collection' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Roll character server-side
    const roll = Math.random()
    let cumulative = 0
    let wonCharacter = characters[characters.length - 1]
    for (const char of characters) {
      cumulative += Number(char.drop_rate)
      if (roll <= cumulative) {
        wonCharacter = char
        break
      }
    }

    // Add to user's collection (upsert for duplicates = XP)
    const { data: existing } = await supabase
      .from('user_characters')
      .select('id, xp, level')
      .eq('user_id', user.id)
      .eq('character_id', wonCharacter.id)
      .single()

    if (existing) {
      const newXp = existing.xp + 50
      const newLevel = Math.floor(newXp / 100) + 1
      await supabase
        .from('user_characters')
        .update({ xp: newXp, level: newLevel })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('user_characters')
        .insert({ user_id: user.id, character_id: wonCharacter.id, equipped: false })
    }

    return new Response(JSON.stringify({
      character: wonCharacter,
      is_duplicate: !!existing,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
