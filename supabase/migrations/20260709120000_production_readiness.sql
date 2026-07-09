-- Production readiness: app_settings, admin-only storage, wallet_transactions RLS

CREATE TABLE IF NOT EXISTS public.app_settings (
  setting_key   TEXT        PRIMARY KEY,
  setting_value TEXT        NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_app_settings" ON public.app_settings;
CREATE POLICY "admin_all_app_settings" ON public.app_settings
  FOR ALL USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "auth_read_app_settings" ON public.app_settings;
CREATE POLICY "auth_read_app_settings" ON public.app_settings
  FOR SELECT USING (public.current_user_role() IN ('customer', 'delivery', 'admin'));

INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('store_name', 'Daily Express'),
  ('support_phone', '+91 98765 43210'),
  ('support_email', 'support@dailyexpress.com'),
  ('delivery_charge', '20'),
  ('min_order_amount', '100'),
  ('free_delivery_above', '500'),
  ('accepting_orders', 'true')
ON CONFLICT (setting_key) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Admin uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('categories', 'products', 'avatars', 'banners')
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "Admin updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('categories', 'products', 'avatars', 'banners')
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (
    bucket_id IN ('categories', 'products', 'avatars', 'banners')
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "Admin deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('categories', 'products', 'avatars', 'banners')
    AND public.current_user_role() = 'admin'
  );

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "admin_all_wallet_transactions" ON public.wallet_transactions
  FOR ALL USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "customer_own_wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "customer_own_wallet_transactions" ON public.wallet_transactions
  FOR SELECT USING (
    public.current_user_role() = 'customer'
    AND customer_id = auth.uid()
  );
