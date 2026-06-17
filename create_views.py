import os
import urllib.request
import urllib.error
import json

# Try to load environment variables from local .env if present
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            # Remove optional quotes surrounding the value
            val = val.strip().strip("'\"")
            os.environ[key.strip()] = val

# Load keys from environment
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "")

# Determine Project Ref from VITE_SUPABASE_URL or use a default
supabase_url = os.getenv("VITE_SUPABASE_URL", "")
PROJECT_REF = ""
if supabase_url:
    PROJECT_REF = supabase_url.replace("https://", "").replace("http://", "").split(".")[0]

if not PROJECT_REF:
    PROJECT_REF = "lgbfzxjrqmnjawqnnaej"

API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def execute_sql(sql, label="query"):
    if not SERVICE_KEY:
        print(f"[FAIL] {label} — Skipped: SUPABASE_SERVICE_ROLE_KEY is not set.")
        return False
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            print(f"[OK] {label}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[FAIL] {label} — {err_body}")
        return False
    except Exception as ex:
        print(f"[FAIL] {label} — {str(ex)}")
        return False

# 1. Create product_variants view
execute_sql("""
CREATE OR REPLACE VIEW public.product_variants AS
SELECT
  id,
  product_id,
  size,
  'Black'::text AS color,
  '#000000'::text AS color_hex,
  size::text AS sku,
  quantity AS stock_qty,
  0::numeric AS extra_price,
  TRUE AS is_active,
  created_at,
  created_at AS updated_at
FROM public.product_sizes;
""", "CREATE VIEW product_variants")

# Triggers for product_variants view
execute_sql("""
CREATE OR REPLACE FUNCTION insert_product_variant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.product_sizes (id, product_id, size, quantity)
  VALUES (COALESCE(NEW.id, uuid_generate_v4()), NEW.product_id, NEW.size, NEW.stock_qty)
  ON CONFLICT (product_id, size)
  DO UPDATE SET quantity = EXCLUDED.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insert_product_variant ON public.product_variants;
CREATE TRIGGER trg_insert_product_variant
INSTEAD OF INSERT ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION insert_product_variant();
""", "product_variants INSTEAD OF INSERT trigger")

execute_sql("""
CREATE OR REPLACE FUNCTION update_product_variant()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.product_sizes
  SET quantity = NEW.stock_qty
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_variant ON public.product_variants;
CREATE TRIGGER trg_update_product_variant
INSTEAD OF UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION update_product_variant();
""", "product_variants INSTEAD OF UPDATE trigger")

execute_sql("""
CREATE OR REPLACE FUNCTION delete_product_variant()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.product_sizes WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_product_variant ON public.product_variants;
CREATE TRIGGER trg_delete_product_variant
INSTEAD OF DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION delete_product_variant();
""", "product_variants INSTEAD OF DELETE trigger")


# 2. Create wishlist_items view
execute_sql("""
CREATE OR REPLACE VIEW public.wishlist_items AS
SELECT
  id,
  user_id,
  product_id,
  created_at
FROM public.wishlist;
""", "CREATE VIEW wishlist_items")


# 3. Create cart_items view
execute_sql("""
CREATE OR REPLACE VIEW public.cart_items AS
SELECT
  c.id,
  c.user_id,
  ps.id AS variant_id,
  c.quantity,
  c.created_at,
  c.updated_at
FROM public.cart c
LEFT JOIN public.product_sizes ps ON ps.product_id = c.product_id AND ps.size = c.size;
""", "CREATE VIEW cart_items")

# Triggers for cart_items view
execute_sql("""
CREATE OR REPLACE FUNCTION insert_cart_item()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_size TEXT;
BEGIN
  SELECT product_id, size INTO v_product_id, v_size
  FROM public.product_sizes
  WHERE id = NEW.variant_id;

  INSERT INTO public.cart (user_id, product_id, size, quantity)
  VALUES (NEW.user_id, v_product_id, v_size, NEW.quantity)
  ON CONFLICT (user_id, product_id, size)
  DO UPDATE SET quantity = public.cart.quantity + EXCLUDED.quantity;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insert_cart_item ON public.cart_items;
CREATE TRIGGER trg_insert_cart_item
INSTEAD OF INSERT ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION insert_cart_item();
""", "cart_items INSTEAD OF INSERT trigger")

execute_sql("""
CREATE OR REPLACE FUNCTION update_cart_item()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_size TEXT;
BEGIN
  SELECT product_id, size INTO v_product_id, v_size
  FROM public.product_sizes
  WHERE id = NEW.variant_id;

  UPDATE public.cart
  SET quantity = NEW.quantity
  WHERE user_id = NEW.user_id AND product_id = v_product_id AND size = v_size;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cart_item ON public.cart_items;
CREATE TRIGGER trg_update_cart_item
INSTEAD OF UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION update_cart_item();
""", "cart_items INSTEAD OF UPDATE trigger")

execute_sql("""
CREATE OR REPLACE FUNCTION delete_cart_item()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_size TEXT;
BEGIN
  SELECT product_id, size INTO v_product_id, v_size
  FROM public.product_sizes
  WHERE id = OLD.variant_id;

  DELETE FROM public.cart
  WHERE user_id = OLD.user_id AND product_id = v_product_id AND size = v_size;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_cart_item ON public.cart_items;
CREATE TRIGGER trg_delete_cart_item
INSTEAD OF DELETE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION delete_cart_item();
""", "cart_items INSTEAD OF DELETE trigger")

print("Migration script execution completed.")
