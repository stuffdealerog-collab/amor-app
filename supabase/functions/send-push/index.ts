import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const VAPID_PUBLIC_KEY = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
        const VAPID_SUBJECT = "mailto:support@amor.app";

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            throw new Error("Missing VAPID keys in environment variables");
        }

        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

        const { targetUserId, title, body, icon, url } = await req.json();

        if (!targetUserId || !title || !body) {
            throw new Error("Missing required payload fields");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('id, endpoint, auth_key, p256dh_key')
            .eq('user_id', targetUserId);

        if (error) {
            throw new Error(`Failed to fetch subscriptions: ${error.message}`);
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No active push subscriptions" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/images/amor-icon-pwa.png',
            url: url || '/'
        });

        const sendPromises = subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    auth: sub.auth_key,
                    p256dh: sub.p256dh_key
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
                return { success: true, id: sub.id };
            } catch (err) {
                // Remove expired/invalid subscriptions
                if ((err as any).statusCode === 404 || (err as any).statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return { success: false, id: sub.id, error: "Subscription expired, removed" };
                }
                return { success: false, id: sub.id, error: (err as Error).message };
            }
        });

        const results = await Promise.all(sendPromises);

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
