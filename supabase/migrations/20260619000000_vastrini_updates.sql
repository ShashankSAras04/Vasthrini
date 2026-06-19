-- Add label column to addresses table
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS label text;

-- Update status check constraint on orders table
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_chk;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_chk CHECK (
  status IN (
    'pending', 'confirmed', 'payment_pending', 'payment_done',
    'shipped', 'on_the_way', 'delivered', 'cancelled', 'returned'
  )
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
