import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encoding/decoding utilities
function b64ToUrlEncoded(b64: string) {
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function strToUint8(str: string) {
    return new TextEncoder().encode(str);
}

// Generate an ES256 JWT using Web Crypto API
async function signVapidJWT(audience: string, subject: string, privateKeyParams: JsonWebKey) {
    const header = { typ: "JWT", alg: "ES256" };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 12 * 60 * 60; // 12 hours
    const payload = { aud: audience, sub: subject, exp };

    const encodedHeader = b64ToUrlEncoded(btoa(JSON.stringify(header)));
    const encodedPayload = b64ToUrlEncoded(btoa(JSON.stringify(payload)));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Import the private key for signing
    const key = await crypto.subtle.importKey(
        "jwk",
        privateKeyParams,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        key,
        strToUint8(unsignedToken)
    );

    // Convert raw ArrayBuffer signature to Base64URL
    let binary = '';
    const bytes = new Uint8Array(signature);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const encodedSignature = b64ToUrlEncoded(btoa(binary));

    return `${unsignedToken}.${encodedSignature}`;
}

// Utility to convert URL-safe Base64 to JWK format for ES256
function vapidPrivateKeyToJwk(rawKey: string): JsonWebKey {
    // The web-push library generates keys as raw base64url strings.
    // For a P-256 curve, the private key (d) is just the 32-byte secret.
    return {
        kty: "EC",
        crv: "P-256",
        x: "1111111111111111111111111111111111111111111", // Dummy public coordinates (not needed for signing)
        y: "1111111111111111111111111111111111111111111", // Dummy
        d: rawKey,
        ext: true
    };
}

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
                JSON.stringify({ success: true, message: "User has no active push subscriptions" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/images/amor-icon-pwa.png',
            url: url || '/'
        });

        const jwkPrivate = vapidPrivateKeyToJwk(VAPID_PRIVATE_KEY);

        const sendPromises = subscriptions.map(async (sub) => {
            try {
                // Determine Push Service Origin (Audience)
                const endpointUrl = new URL(sub.endpoint);
                const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

                // Generate VAPID JWT Header
                const jwt = await signVapidJWT(audience, VAPID_SUBJECT, jwkPrivate);

                // Note: Pure native Web Crypto push requires AES-GCM encryption of the payload.
                // Since Deno Edge struggles with npm:web-push, and full RFC8291 encryption is heavy,
                // we will use the open Push Service without payload encryption IF IT WORKS on iOS,
                // OR we fallback to a lightweight native encryption routine. 
                // For this test, we send the notification with the VAPID headers to see if it bypasses 500.

                // Let's rely on a lightweight Edge-compatible web-push wrapper instead of raw.
                // The npm:web-push package often throws 500 because it uses Node purely.

                throw new Error("Temporary block: Recompiling Edge JWT Logic");
            } catch (err) {
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
