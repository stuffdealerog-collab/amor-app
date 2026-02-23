-- Admin: allow authenticated users to insert and delete promo_codes
-- Security note: the admin page itself checks email whitelist client-side.
-- For production, add a server-side check or use Supabase custom claims.

CREATE POLICY "promo_codes_insert" ON promo_codes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "promo_codes_delete" ON promo_codes
  FOR DELETE TO authenticated
  USING (true);
