-- ================================================================
-- DAIRY HOME DELIVERY APP — SUPABASE PRODUCTION SCHEMA v2
-- Compatible with: Supabase SQL Editor
-- Improvements: inventory control, address snapshots, state machine,
--   role validation, delivery tracking, product gallery, enhanced
--   notifications, cart price snapshots, audit logs, webhook logs,
--   subscription-ready foundation.
-- ================================================================


-- ================================================================
-- 0. EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- 1. ENUMS
-- ================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role          AS ENUM ('admin', 'customer', 'delivery');
  CREATE TYPE public.order_status      AS ENUM (
    'pending','accepted','packed','out_for_delivery','delivered','cancelled'
  );
  CREATE TYPE public.payment_method    AS ENUM ('cod','razorpay');
  CREATE TYPE public.payment_status    AS ENUM ('pending','success','failed','refunded');
  CREATE TYPE public.notification_type AS ENUM (
    'new_order','order_accepted','payment_success','out_for_delivery','delivered'
  );
  CREATE TYPE public.device_platform   AS ENUM ('android','ios','web');
  CREATE TYPE public.sub_frequency     AS ENUM ('daily','alternate_days','weekly','custom');
  CREATE TYPE public.sub_status        AS ENUM ('active','paused','cancelled','expired');
  CREATE TYPE public.audit_action      AS ENUM (
    'create','update','delete','login','logout',
    'assign','cancel','refund','activate','deactivate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 2. HELPER: updated_at TRIGGER FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ================================================================
-- 3. PROFILES
--    • Delivery-specific location + availability columns added.
--    • Role guard enforced via trigger on FK references.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                public.app_role NOT NULL DEFAULT 'customer',
  full_name           TEXT            NOT NULL,
  phone               TEXT            UNIQUE,
  avatar_url          TEXT,

  -- Push / device
  fcm_token           TEXT,
  device_platform     public.device_platform,

  -- Delivery-agent fields (NULL for customer / admin)
  is_online           BOOLEAN         NOT NULL DEFAULT FALSE,
  last_seen           TIMESTAMPTZ,
  current_latitude    NUMERIC(10,7),
  current_longitude   NUMERIC(10,7),
  active_order_count  INT             NOT NULL DEFAULT 0 CHECK (active_order_count >= 0),

  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_phone_check
    CHECK (phone ~ '^[0-9+\-\s]{7,20}$'),
  CONSTRAINT delivery_fields_only_for_delivery
    CHECK (
      role = 'delivery'
      OR (is_online = FALSE AND current_latitude IS NULL
          AND current_longitude IS NULL AND active_order_count = 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_online_delivery
  ON public.profiles(is_online)
  WHERE role = 'delivery' AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_delivery_location
  ON public.profiles(current_latitude, current_longitude)
  WHERE role = 'delivery' AND is_online = TRUE;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 4. CATEGORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active
  ON public.categories(active);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 5. PRODUCTS
--    image_url removed — replaced by product_images table.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id  UUID          NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name         TEXT          NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  unit         TEXT          NOT NULL,   -- e.g. "500ml", "1L", "1kg"
  stock        INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active
  ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_stock
  ON public.products(stock)
  WHERE active = TRUE;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 6. PRODUCT IMAGES  (multi-image gallery)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  alt_text    TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary
  ON public.product_images(product_id)
  WHERE is_primary = TRUE;

-- Enforce one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary
  ON public.product_images(product_id)
  WHERE is_primary = TRUE;

CREATE TRIGGER trg_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-unset previous primary when a new one is set
CREATE OR REPLACE FUNCTION public.enforce_single_primary_image()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.product_images
    SET    is_primary = FALSE
    WHERE  product_id = NEW.product_id
      AND  id <> NEW.id
      AND  is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_primary_image
  BEFORE INSERT OR UPDATE OF is_primary ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_image();


-- ================================================================
-- 7. ADDRESSES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label          TEXT        NOT NULL DEFAULT 'Home',
  full_name      TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  line1          TEXT        NOT NULL,
  line2          TEXT,
  city           TEXT        NOT NULL,
  state          TEXT        NOT NULL,
  pincode        TEXT        NOT NULL,
  latitude       NUMERIC(10,7),
  longitude      NUMERIC(10,7),
  is_default     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer
  ON public.addresses(customer_id);

-- One default address per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON public.addresses(customer_id)
  WHERE is_default = TRUE;

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.addresses
    SET    is_default = FALSE
    WHERE  customer_id = NEW.customer_id
      AND  id <> NEW.id
      AND  is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_address
  BEFORE INSERT OR UPDATE OF is_default ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_address();


-- ================================================================
-- 8. ORDER ADDRESSES  (immutable snapshot at order time)
--    Decouples order history from mutable customer addresses.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.order_addresses (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- source reference (informational only — NOT a hard FK so snapshot survives address deletion)
  address_id  UUID,
  full_name   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  line1       TEXT        NOT NULL,
  line2       TEXT,
  city        TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  pincode     TEXT        NOT NULL,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Intentionally no updated_at — snapshots are immutable
);

CREATE INDEX IF NOT EXISTS idx_order_addresses_source
  ON public.order_addresses(address_id);


-- ================================================================
-- 9. CARTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 10. CART ITEMS
--     snapshot_price captures price at add-to-cart time to
--     prevent price-manipulation between add and checkout.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id         UUID          NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity        INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  snapshot_price  NUMERIC(10,2) NOT NULL CHECK (snapshot_price >= 0),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart
  ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product
  ON public.cart_items(product_id);

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-populate snapshot_price from product.price at INSERT
CREATE OR REPLACE FUNCTION public.set_cart_item_snapshot_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot_price IS NULL OR NEW.snapshot_price = 0 THEN
    SELECT price INTO NEW.snapshot_price
    FROM   public.products
    WHERE  id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cart_item_snapshot_price
  BEFORE INSERT ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_cart_item_snapshot_price();


-- ================================================================
-- 11. ORDERS
--     • order_address_id → order_addresses (snapshot, immutable)
--     • customer_id / delivery_boy_id role-validated by trigger
--     • order_status transitions enforced by trigger (state machine)
-- ================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT                  NOT NULL UNIQUE
                        DEFAULT ('ORD-' || LPAD(NEXTVAL('public.order_number_seq')::TEXT, 6, '0')),

  -- Roles
  customer_id         UUID                  NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  delivery_boy_id     UUID                  REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Immutable address snapshot (FK to order_addresses)
  order_address_id    UUID                  NOT NULL REFERENCES public.order_addresses(id) ON DELETE RESTRICT,

  -- Subscription linkage (NULL for one-time orders)
  subscription_id     UUID,                 -- FK added after subscriptions table exists (below)

  -- Financials
  subtotal            NUMERIC(10,2)         NOT NULL CHECK (subtotal >= 0),
  delivery_charge     NUMERIC(10,2)         NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  total               NUMERIC(10,2)         NOT NULL CHECK (total >= 0),

  -- Payment
  payment_method      public.payment_method NOT NULL DEFAULT 'cod',
  payment_status      public.payment_status NOT NULL DEFAULT 'pending',

  -- Status
  order_status        public.order_status   NOT NULL DEFAULT 'pending',

  notes               TEXT,

  -- Timestamps per lifecycle stage
  accepted_at         TIMESTAMPTZ,
  packed_at           TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_total_integrity
    CHECK (total = subtotal + delivery_charge),
  CONSTRAINT chk_delivery_boy_only_when_accepted
    CHECK (delivery_boy_id IS NULL OR order_status <> 'pending')
);

CREATE INDEX IF NOT EXISTS idx_orders_customer
  ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy
  ON public.orders(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pending
  ON public.orders(order_status)
  WHERE order_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_subscription
  ON public.orders(subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 11a. ROLE VALIDATION TRIGGER for orders ──────────────────
-- Ensures customer_id always points to a 'customer' profile
-- and delivery_boy_id always points to a 'delivery' profile.
CREATE OR REPLACE FUNCTION public.validate_order_roles()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_customer_role  public.app_role;
  v_delivery_role  public.app_role;
BEGIN
  SELECT role INTO v_customer_role
  FROM public.profiles WHERE id = NEW.customer_id;

  IF v_customer_role IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'orders.customer_id must reference a profile with role=customer (got %)', v_customer_role;
  END IF;

  IF NEW.delivery_boy_id IS NOT NULL THEN
    SELECT role INTO v_delivery_role
    FROM public.profiles WHERE id = NEW.delivery_boy_id;

    IF v_delivery_role IS DISTINCT FROM 'delivery' THEN
      RAISE EXCEPTION 'orders.delivery_boy_id must reference a profile with role=delivery (got %)', v_delivery_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_roles
  BEFORE INSERT OR UPDATE OF customer_id, delivery_boy_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_roles();


-- ── 11b. ORDER STATE MACHINE TRIGGER ─────────────────────────
-- Enforces allowed transitions only:
--   pending       → accepted | cancelled
--   accepted      → packed   | cancelled
--   packed        → out_for_delivery
--   out_for_delivery → delivered
--   delivered / cancelled are terminal
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.order_status = NEW.order_status THEN
    RETURN NEW;   -- no-op
  END IF;

  IF OLD.order_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION
      'Order % is in terminal state "%" and cannot be changed.',
      OLD.order_number, OLD.order_status;
  END IF;

  IF NOT (
       (OLD.order_status = 'pending'          AND NEW.order_status IN ('accepted',         'cancelled'))
    OR (OLD.order_status = 'accepted'         AND NEW.order_status IN ('packed',            'cancelled'))
    OR (OLD.order_status = 'packed'           AND NEW.order_status =  'out_for_delivery')
    OR (OLD.order_status = 'out_for_delivery' AND NEW.order_status =  'delivered')
  ) THEN
    RAISE EXCEPTION
      'Invalid order status transition: "%" → "%" for order %.',
      OLD.order_status, NEW.order_status, OLD.order_number;
  END IF;

  -- Stamp lifecycle timestamps automatically
  CASE NEW.order_status
    WHEN 'accepted'         THEN NEW.accepted_at   = COALESCE(NEW.accepted_at,   NOW());
    WHEN 'packed'           THEN NEW.packed_at      = COALESCE(NEW.packed_at,     NOW());
    WHEN 'out_for_delivery' THEN NEW.dispatched_at  = COALESCE(NEW.dispatched_at, NOW());
    WHEN 'delivered'        THEN NEW.delivered_at   = COALESCE(NEW.delivered_at,  NOW());
    WHEN 'cancelled'        THEN NEW.cancelled_at   = COALESCE(NEW.cancelled_at,  NOW());
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_state_machine
  BEFORE UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();


-- ================================================================
-- 12. ORDER ITEMS  (price snapshot included)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name  TEXT          NOT NULL,     -- snapshot
  product_unit  TEXT          NOT NULL,     -- snapshot
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity      INT           NOT NULL CHECK (quantity > 0),
  line_total    NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_order_item_line_total
    CHECK (line_total = unit_price * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product
  ON public.order_items(product_id);

CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 13. PAYMENTS  (Razorpay; COD needs no row)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID                  NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_order_id    TEXT                  NOT NULL,
  razorpay_payment_id  TEXT,
  razorpay_signature   TEXT,
  amount               NUMERIC(10,2)         NOT NULL CHECK (amount > 0),
  currency             TEXT                  NOT NULL DEFAULT 'INR',
  status               public.payment_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order
  ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_rzp_order_id
  ON public.payments(razorpay_order_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- 14. PAYMENT WEBHOOK LOGS
--     Raw inbound webhook payloads for reconciliation / debugging.
--     Written by Edge Function / backend; never by client.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider       TEXT        NOT NULL DEFAULT 'razorpay',
  event_type     TEXT        NOT NULL,            -- e.g. "payment.captured"
  razorpay_event_id TEXT,                          -- X-Razorpay-Event-Id header
  payload        JSONB       NOT NULL,
  signature      TEXT,                             -- raw header for verification audit
  processed      BOOLEAN     NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhooks_provider_event
  ON public.payment_webhooks(provider, event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed
  ON public.payment_webhooks(processed, received_at)
  WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_webhooks_rzp_event_id
  ON public.payment_webhooks(razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;


-- ================================================================
-- 15. ORDER STATUS HISTORY  (auto-populated via trigger)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID               NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  changed_by   UUID               REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_status   public.order_status,
  new_status   public.order_status NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osh_order
  ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_osh_changed_by
  ON public.order_status_history(changed_by);

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.order_status_history(order_id, changed_by, old_status, new_status)
    VALUES (NEW.id, auth.uid(), OLD.order_status, NEW.order_status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_history
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();


-- ================================================================
-- 16. NOTIFICATIONS  (enhanced)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id        UUID                     REFERENCES public.orders(id) ON DELETE SET NULL,
  type            public.notification_type NOT NULL,
  title           TEXT                     NOT NULL,
  body            TEXT                     NOT NULL,
  data            JSONB,                   -- arbitrary push payload
  device_platform public.device_platform,
  device_token    TEXT,                    -- FCM/APNs token snapshot at send time
  is_read         BOOLEAN                  NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,             -- set when is_read flips to TRUE
  sent_at         TIMESTAMPTZ,
  failed_reason   TEXT,                    -- populated if push delivery failed
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order
  ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE is_read = FALSE;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-set read_at when is_read flips TRUE
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notification_read_at
  BEFORE UPDATE OF is_read ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_read_at();


-- ================================================================
-- 17. AUDIT LOGS
--     Tracks admin actions across the system. Written via
--     SECURITY DEFINER helper or Edge Functions — never by clients.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID               REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role    public.app_role,
  action        public.audit_action NOT NULL,
  table_name    TEXT               NOT NULL,
  record_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- Convenience function for application code / Edge Functions
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action      public.audit_action,
  p_table_name  TEXT,
  p_record_id   UUID      DEFAULT NULL,
  p_old_data    JSONB     DEFAULT NULL,
  p_new_data    JSONB     DEFAULT NULL,
  p_note        TEXT      DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(actor_id, actor_role, action, table_name, record_id, old_data, new_data, note)
  VALUES (auth.uid(), v_role, p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_note);
END;
$$;


-- ================================================================
-- 18. INVENTORY MANAGEMENT
--
--   18a. deduct_stock_on_order()   — called inside place_order RPC
--   18b. restore_stock_on_cancel() — trigger on orders.order_status
--   18c. Both use SELECT ... FOR UPDATE on products rows to prevent
--        race conditions / overselling.
-- ================================================================

-- 18a. Called from place_order() after order row is created.
--      Locks product rows, checks stock, deducts quantity.
CREATE OR REPLACE FUNCTION public.deduct_order_stock(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oi.product_id, oi.quantity
    FROM   public.order_items oi
    WHERE  oi.order_id = p_order_id
    ORDER  BY oi.product_id          -- consistent lock ordering avoids deadlocks
  LOOP
    UPDATE public.products
    SET    stock = stock - r.quantity
    WHERE  id    = r.product_id
      AND  stock >= r.quantity;      -- atomic guard

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Insufficient stock for product %. Order not placed.', r.product_id
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;

-- 18b. Restore stock when an order is cancelled (before delivery).
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_status = 'cancelled'
     AND OLD.order_status NOT IN ('delivered', 'cancelled')
  THEN
    UPDATE public.products p
    SET    stock = p.stock + oi.quantity
    FROM   public.order_items oi
    WHERE  oi.order_id  = NEW.id
      AND  p.id         = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();


-- ================================================================
-- 19. PLACE ORDER (race-condition-safe RPC)
--
--   Atomically:
--     1. Snapshot address → order_addresses
--     2. Lock product rows (FOR UPDATE)
--     3. Verify stock for every line item
--     4. Insert order + order_items
--     5. Deduct stock
--     6. Clear cart
--     7. Notify delivery boys
--
--   Returns the new order UUID.
-- ================================================================
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id      UUID,
  p_payment_method  public.payment_method DEFAULT 'cod',
  p_notes           TEXT                  DEFAULT NULL,
  p_delivery_charge NUMERIC(10,2)         DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id    UUID;
  v_cart_id        UUID;
  v_order_id       UUID;
  v_addr_snap_id   UUID;
  v_subtotal       NUMERIC(10,2) := 0;
  v_total          NUMERIC(10,2);
  r                RECORD;
BEGIN
  v_customer_id := auth.uid();

  -- Verify caller is a customer
  IF (SELECT role FROM public.profiles WHERE id = v_customer_id) <> 'customer' THEN
    RAISE EXCEPTION 'Only customers can place orders';
  END IF;

  -- Fetch cart
  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE customer_id = v_customer_id;

  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'No cart found for this customer';
  END IF;

  -- Ensure cart is not empty
  IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Verify address belongs to customer
  IF NOT EXISTS (
    SELECT 1 FROM public.addresses
    WHERE id = p_address_id AND customer_id = v_customer_id
  ) THEN
    RAISE EXCEPTION 'Address not found or does not belong to customer';
  END IF;

  -- ── Step 1: Snapshot the address ──────────────────────────
  INSERT INTO public.order_addresses(
    address_id, full_name, phone, line1, line2,
    city, state, pincode, latitude, longitude, label
  )
  SELECT
    id, full_name, phone, line1, line2,
    city, state, pincode, latitude, longitude, label
  FROM public.addresses
  WHERE id = p_address_id
  RETURNING id INTO v_addr_snap_id;

  -- ── Step 2 & 3: Lock products, verify stock ────────────────
  FOR r IN
    SELECT ci.product_id, ci.quantity, ci.snapshot_price
    FROM   public.cart_items ci
    WHERE  ci.cart_id = v_cart_id
    ORDER  BY ci.product_id               -- consistent ordering
    FOR UPDATE OF -- lock each product row
      -- inline subquery approach: we lock via products directly
      -- (cart_items locks are not useful; product rows hold stock)
      ci                                  -- lock cart_items too to be safe
  LOOP
    DECLARE
      v_stock INT;
    BEGIN
      SELECT stock INTO v_stock
      FROM   public.products
      WHERE  id = r.product_id
      FOR UPDATE;                         -- pessimistic row lock

      IF v_stock < r.quantity THEN
        RAISE EXCEPTION
          'Product % has only % units in stock, but % requested.',
          r.product_id, v_stock, r.quantity
          USING ERRCODE = 'P0001';
      END IF;

      v_subtotal := v_subtotal + (r.snapshot_price * r.quantity);
    END;
  END LOOP;

  v_total := v_subtotal + p_delivery_charge;

  -- ── Step 4: Create order ───────────────────────────────────
  INSERT INTO public.orders(
    customer_id, order_address_id, subtotal,
    delivery_charge, total, payment_method, notes
  )
  VALUES (
    v_customer_id, v_addr_snap_id, v_subtotal,
    p_delivery_charge, v_total, p_payment_method, p_notes
  )
  RETURNING id INTO v_order_id;

  -- ── Step 4b: Insert order items ────────────────────────────
  INSERT INTO public.order_items(
    order_id, product_id, product_name, product_unit,
    unit_price, quantity, line_total
  )
  SELECT
    v_order_id,
    p.id,
    p.name,
    p.unit,
    ci.snapshot_price,
    ci.quantity,
    ci.snapshot_price * ci.quantity
  FROM  public.cart_items ci
  JOIN  public.products   p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;

  -- ── Step 5: Deduct stock ───────────────────────────────────
  PERFORM public.deduct_order_stock(v_order_id);

  -- ── Step 6: Clear cart ────────────────────────────────────
  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  -- ── Step 7: Notify all online delivery boys ────────────────
  INSERT INTO public.notifications(user_id, order_id, type, title, body)
  SELECT
    p.id,
    v_order_id,
    'new_order',
    'New Order Available',
    'A new order is waiting to be accepted.'
  FROM public.profiles p
  WHERE p.role      = 'delivery'
    AND p.is_online = TRUE
    AND p.is_active = TRUE;

  RETURN v_order_id;
END;
$$;


-- ================================================================
-- 20. ACCEPT ORDER (race-condition-safe RPC)
--     FOR UPDATE SKIP LOCKED ensures exactly one delivery boy wins.
-- ================================================================
CREATE OR REPLACE FUNCTION public.accept_order(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID;
  v_caller_role public.app_role;
  v_order       public.orders%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();

  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'delivery' THEN
    RAISE EXCEPTION 'Only delivery users can accept orders';
  END IF;

  -- Verify delivery agent is active & online
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND is_online = TRUE AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Delivery agent must be online and active to accept orders';
  END IF;

  -- Attempt to claim the order — SKIP LOCKED means only one winner
  SELECT * INTO v_order
  FROM public.orders
  WHERE id           = p_order_id
    AND order_status = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN 'already_taken';
  END IF;

  -- Assign and advance (state machine trigger validates transition)
  UPDATE public.orders
  SET    delivery_boy_id = v_caller_id,
         order_status    = 'accepted'
  WHERE  id = p_order_id;

  -- Increment agent's active order count
  UPDATE public.profiles
  SET    active_order_count = active_order_count + 1
  WHERE  id = v_caller_id;

  -- Notify customer
  INSERT INTO public.notifications(user_id, order_id, type, title, body)
  VALUES (
    v_order.customer_id,
    p_order_id,
    'order_accepted',
    'Order Accepted',
    'Your order ' || v_order.order_number || ' has been accepted by a delivery partner.'
  );

  -- Remove the "new order" notification from other delivery boys
  DELETE FROM public.notifications
  WHERE  order_id = p_order_id
    AND  type     = 'new_order'
    AND  user_id <> v_caller_id
    AND  is_read  = FALSE;

  RETURN 'accepted';
END;
$$;

-- Decrement active_order_count when order completes or is cancelled
CREATE OR REPLACE FUNCTION public.update_delivery_active_order_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_status IN ('delivered', 'cancelled')
     AND OLD.order_status NOT IN ('delivered', 'cancelled')
     AND NEW.delivery_boy_id IS NOT NULL
  THEN
    UPDATE public.profiles
    SET    active_order_count = GREATEST(active_order_count - 1, 0)
    WHERE  id = NEW.delivery_boy_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delivery_active_order_count
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_delivery_active_order_count();


-- ================================================================
-- 21. SUBSCRIPTIONS  (future-proof daily milk delivery)
--
--   Design principles:
--   • Existing one-time order flow is UNTOUCHED.
--   • Subscriptions generate orders via the same orders table.
--   • orders.subscription_id links generated orders back here.
--   • A scheduler (pg_cron / Edge Function cron) calls
--     generate_subscription_orders() daily.
-- ================================================================

-- 21a. Subscription plans (reusable templates)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT          NOT NULL UNIQUE,   -- e.g. "Daily Milk Starter"
  description     TEXT,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sub_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 21b. Customer subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID                 NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plan_id           UUID                 REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  address_id        UUID                 NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  frequency         public.sub_frequency NOT NULL DEFAULT 'daily',
  -- For custom frequency: store delivery days as array of ISO day numbers (1=Mon … 7=Sun)
  custom_days       INT[]                CHECK (
                      frequency <> 'custom' OR (custom_days IS NOT NULL AND array_length(custom_days, 1) > 0)
                    ),
  start_date        DATE                 NOT NULL,
  end_date          DATE,                -- NULL = indefinite
  status            public.sub_status    NOT NULL DEFAULT 'active',
  payment_method    public.payment_method NOT NULL DEFAULT 'cod',
  delivery_charge   NUMERIC(10,2)        NOT NULL DEFAULT 0,
  notes             TEXT,
  next_order_date   DATE                 NOT NULL,
  last_order_date   DATE,
  total_orders_generated INT             NOT NULL DEFAULT 0,
  paused_until      DATE,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sub_dates
    CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
  ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_order
  ON public.subscriptions(next_order_date)
  WHERE status = 'active';

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add FK from orders → subscriptions (deferred to avoid forward-ref issue)
ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_subscription
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- 21c. Subscription line items (products + quantities per sub)
CREATE TABLE IF NOT EXISTS public.subscription_items (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID          NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity        INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (subscription_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_items_subscription
  ON public.subscription_items(subscription_id);

CREATE TRIGGER trg_sub_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 21d. Subscription order generation function
--      Called by a daily cron job / pg_cron schedule.
--      Re-uses the same orders + order_items infrastructure.
CREATE OR REPLACE FUNCTION public.generate_subscription_orders(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub           RECORD;
  v_order_id      UUID;
  v_addr_snap_id  UUID;
  v_subtotal      NUMERIC(10,2);
  v_orders_created INT := 0;
BEGIN
  FOR v_sub IN
    SELECT s.*
    FROM   public.subscriptions s
    WHERE  s.status          = 'active'
      AND  s.next_order_date <= p_run_date
      AND  (s.end_date IS NULL OR s.end_date >= p_run_date)
      AND  (s.paused_until IS NULL OR s.paused_until < p_run_date)
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    BEGIN
      -- Compute subtotal from current product prices
      SELECT COALESCE(SUM(p.price * si.quantity), 0)
      INTO   v_subtotal
      FROM   public.subscription_items si
      JOIN   public.products p ON p.id = si.product_id
      WHERE  si.subscription_id = v_sub.id
        AND  p.active = TRUE;

      IF v_subtotal = 0 THEN
        -- No active products; skip silently
        CONTINUE;
      END IF;

      -- Snapshot address
      INSERT INTO public.order_addresses(
        address_id, full_name, phone, line1, line2,
        city, state, pincode, latitude, longitude, label
      )
      SELECT id, full_name, phone, line1, line2,
             city, state, pincode, latitude, longitude, label
      FROM   public.addresses
      WHERE  id = v_sub.address_id
      RETURNING id INTO v_addr_snap_id;

      -- Create order (bypasses cart; direct insert)
      INSERT INTO public.orders(
        customer_id, order_address_id, subscription_id,
        subtotal, delivery_charge, total,
        payment_method, notes
      )
      VALUES (
        v_sub.customer_id, v_addr_snap_id, v_sub.id,
        v_subtotal, v_sub.delivery_charge, v_subtotal + v_sub.delivery_charge,
        v_sub.payment_method,
        'Auto-generated subscription order'
      )
      RETURNING id INTO v_order_id;

      -- Insert order items with current prices as snapshot
      INSERT INTO public.order_items(
        order_id, product_id, product_name, product_unit,
        unit_price, quantity, line_total
      )
      SELECT
        v_order_id, p.id, p.name, p.unit,
        p.price, si.quantity, p.price * si.quantity
      FROM  public.subscription_items si
      JOIN  public.products p ON p.id = si.product_id
      WHERE si.subscription_id = v_sub.id
        AND p.active = TRUE;

      -- Deduct stock
      PERFORM public.deduct_order_stock(v_order_id);

      -- Advance next_order_date
      UPDATE public.subscriptions
      SET
        last_order_date        = p_run_date,
        total_orders_generated = total_orders_generated + 1,
        next_order_date = CASE v_sub.frequency
          WHEN 'daily'          THEN p_run_date + INTERVAL '1 day'
          WHEN 'alternate_days' THEN p_run_date + INTERVAL '2 days'
          WHEN 'weekly'         THEN p_run_date + INTERVAL '7 days'
          WHEN 'custom'         THEN (
            -- next weekday from custom_days[] after p_run_date
            p_run_date + (
              SELECT MIN(
                MOD(d - EXTRACT(ISODOW FROM p_run_date)::INT + 7, 7)
              )
              FROM unnest(v_sub.custom_days) AS d
              WHERE MOD(d - EXTRACT(ISODOW FROM p_run_date)::INT + 7, 7) > 0
            ) * INTERVAL '1 day'
          )
          ELSE p_run_date + INTERVAL '1 day'
        END
      WHERE id = v_sub.id;

      -- Notify customer
      INSERT INTO public.notifications(user_id, order_id, type, title, body)
      VALUES (
        v_sub.customer_id, v_order_id, 'new_order',
        'Subscription Order Placed',
        'Your daily subscription order has been placed automatically.'
      );

      v_orders_created := v_orders_created + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log failure but continue processing other subscriptions
      RAISE WARNING 'Subscription % failed: %', v_sub.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  RETURN v_orders_created;
END;
$$;


-- ================================================================
-- 22. HELPER: current_user_role()
-- ================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ================================================================
-- 23. ROW LEVEL SECURITY
-- ================================================================

-- ── 23.1 PROFILES ────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id AND public.current_user_role() = 'customer');

CREATE POLICY "delivery_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id AND public.current_user_role() = 'delivery');


-- ── 23.2 CATEGORIES ──────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_categories" ON public.categories
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "auth_read_active_categories" ON public.categories
  FOR SELECT USING (active = TRUE AND public.current_user_role() IN ('customer','delivery'));


-- ── 23.3 PRODUCTS ────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_products" ON public.products
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "auth_read_active_products" ON public.products
  FOR SELECT USING (active = TRUE AND public.current_user_role() IN ('customer','delivery'));


-- ── 23.4 PRODUCT IMAGES ──────────────────────────────────────
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_product_images" ON public.product_images
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "auth_read_product_images" ON public.product_images
  FOR SELECT USING (public.current_user_role() IN ('customer','delivery'));


-- ── 23.5 ADDRESSES ───────────────────────────────────────────
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_addresses" ON public.addresses
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_addresses" ON public.addresses
  FOR ALL USING (customer_id = auth.uid() AND public.current_user_role() = 'customer');

CREATE POLICY "delivery_assigned_order_address" ON public.addresses
  FOR SELECT USING (
    public.current_user_role() = 'delivery'
    AND id IN (
      -- The snapshot references the original address_id
      SELECT oa.address_id
      FROM   public.order_addresses oa
      JOIN   public.orders o ON o.order_address_id = oa.id
      WHERE  o.delivery_boy_id = auth.uid()
    )
  );


-- ── 23.6 ORDER ADDRESSES (snapshots) ─────────────────────────
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_order_addresses" ON public.order_addresses
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_order_addresses" ON public.order_addresses
  FOR SELECT USING (
    public.current_user_role() = 'customer'
    AND id IN (
      SELECT order_address_id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "delivery_assigned_order_address_snap" ON public.order_addresses
  FOR SELECT USING (
    public.current_user_role() = 'delivery'
    AND id IN (
      SELECT order_address_id FROM public.orders WHERE delivery_boy_id = auth.uid()
    )
  );


-- ── 23.7 CARTS ───────────────────────────────────────────────
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_carts" ON public.carts
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_cart" ON public.carts
  FOR ALL USING (customer_id = auth.uid() AND public.current_user_role() = 'customer');


-- ── 23.8 CART ITEMS ──────────────────────────────────────────
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_cart_items" ON public.cart_items
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_cart_items" ON public.cart_items
  FOR ALL USING (
    public.current_user_role() = 'customer'
    AND cart_id IN (
      SELECT id FROM public.carts WHERE customer_id = auth.uid()
    )
  );


-- ── 23.9 ORDERS ──────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_orders" ON public.orders
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_orders" ON public.orders
  FOR ALL USING (customer_id = auth.uid() AND public.current_user_role() = 'customer');

CREATE POLICY "delivery_visible_orders" ON public.orders
  FOR SELECT USING (
    public.current_user_role() = 'delivery'
    AND (order_status = 'pending' OR delivery_boy_id = auth.uid())
  );

CREATE POLICY "delivery_update_assigned_order" ON public.orders
  FOR UPDATE USING (
    public.current_user_role() = 'delivery'
    AND delivery_boy_id = auth.uid()
  )
  WITH CHECK (
    public.current_user_role() = 'delivery'
    AND delivery_boy_id = auth.uid()
  );


-- ── 23.10 ORDER ITEMS ────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_order_items" ON public.order_items
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_order_items" ON public.order_items
  FOR SELECT USING (
    public.current_user_role() = 'customer'
    AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "delivery_assigned_order_items" ON public.order_items
  FOR SELECT USING (
    public.current_user_role() = 'delivery'
    AND order_id IN (SELECT id FROM public.orders WHERE delivery_boy_id = auth.uid())
  );


-- ── 23.11 PAYMENTS ───────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_payments" ON public.payments
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_payments" ON public.payments
  FOR SELECT USING (
    public.current_user_role() = 'customer'
    AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "customer_insert_payment" ON public.payments
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'customer'
    AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
  );


-- ── 23.12 PAYMENT WEBHOOKS ───────────────────────────────────
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Only admins and service-role (Edge Functions) can access
CREATE POLICY "admin_all_webhooks" ON public.payment_webhooks
  FOR ALL USING (public.current_user_role() = 'admin');


-- ── 23.13 ORDER STATUS HISTORY ───────────────────────────────
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_osh" ON public.order_status_history
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_osh" ON public.order_status_history
  FOR SELECT USING (
    public.current_user_role() = 'customer'
    AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "delivery_assigned_osh" ON public.order_status_history
  FOR SELECT USING (
    public.current_user_role() = 'delivery'
    AND order_id IN (SELECT id FROM public.orders WHERE delivery_boy_id = auth.uid())
  );


-- ── 23.14 NOTIFICATIONS ──────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "user_own_notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());


-- ── 23.15 AUDIT LOGS ─────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_logs" ON public.audit_logs
  FOR SELECT USING (public.current_user_role() = 'admin');

-- Only service-role / SECURITY DEFINER functions write audit logs
-- No INSERT/UPDATE/DELETE policy for regular users


-- ── 23.16 SUBSCRIPTIONS ──────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_subscriptions" ON public.subscriptions
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_subscriptions" ON public.subscriptions
  FOR ALL USING (customer_id = auth.uid() AND public.current_user_role() = 'customer');


ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_sub_plans" ON public.subscription_plans
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "auth_read_active_sub_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE AND public.current_user_role() IN ('customer','delivery'));


ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_sub_items" ON public.subscription_items
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "customer_own_sub_items" ON public.subscription_items
  FOR ALL USING (
    public.current_user_role() = 'customer'
    AND subscription_id IN (
      SELECT id FROM public.subscriptions WHERE customer_id = auth.uid()
    )
  );


-- ================================================================
-- 24. AUTO-CREATE PROFILE ON SIGNUP
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.app_role,
    'customer'
  );

  -- Self-registration always gets customer; only admin-created users can be delivery
  IF v_role <> 'customer' AND NOT (NEW.raw_app_meta_data->>'created_by_admin')::BOOLEAN THEN
    v_role := 'customer';
  END IF;

  INSERT INTO public.profiles(id, role, full_name, phone)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- 25. ADMIN: create delivery user helper
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_delivery_user(
  p_full_name TEXT,
  p_phone     TEXT,
  p_email     TEXT,
  p_password  TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can create delivery accounts';
  END IF;

  v_uid := gen_random_uuid();

  INSERT INTO auth.users(
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data, role, aud
  )
  VALUES (
    v_uid,
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone, 'role', 'delivery'),
    '{"provider":"email","providers":["email"],"created_by_admin":true}'::jsonb,
    'authenticated',
    'authenticated'
  );

  UPDATE public.profiles
  SET    role = 'delivery', full_name = p_full_name, phone = p_phone
  WHERE  id = v_uid;

  -- Audit
  PERFORM public.write_audit_log('create', 'profiles', v_uid,
    NULL, jsonb_build_object('role','delivery','full_name',p_full_name));

  RETURN v_uid;
END;
$$;


-- ================================================================
-- 26. REALTIME
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;  -- delivery location updates


-- ================================================================
-- 27. SEED: uncomment and set your admin auth UUID after first login
-- ================================================================
-- INSERT INTO public.profiles(id, role, full_name)
-- VALUES ('<YOUR-ADMIN-AUTH-UUID>', 'admin', 'Super Admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';


-- ================================================================
-- END OF SCHEMA v2
-- ================================================================