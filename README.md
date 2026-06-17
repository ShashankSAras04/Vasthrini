# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 🛡️ Database & Deployment Security Setup

### 1. Vercel Environment Variables
Make sure to add the following variables in your **Vercel Project Settings &rarr; Environment Variables** so the project can connect to your Supabase instance:
- `VITE_SUPABASE_URL`: Your Supabase Project API URL (e.g., `https://your-project.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Public/Anon key.

> [!WARNING]
> Do NOT set the secret service role key (`SUPABASE_SERVICE_ROLE_KEY`) on Vercel or check it into Git. It bypasses Row-Level Security (RLS) and is strictly for secure, local migration operations.

### 2. Local Database Migrations
To run migrations or views creation with `create_views.py` locally:
1. Create a `.env` file at the root of the project (this file is ignored by Git).
2. Add your environment variables:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
   ```
3. Run the script:
   ```bash
   python create_views.py
   ```

### 3. Supabase Row Level Security (RLS) Policies
To secure your data and prevent unauthorized read/write access via the public anon key, run the following SQL script in your **Supabase SQL Editor**:

```sql
-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 1. Profiles Policies
-- ----------------------------------------------------
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ----------------------------------------------------
-- 2. Addresses Policies
-- ----------------------------------------------------
CREATE POLICY "Allow users to access their own addresses"
  ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- 3. Cart Policies
-- ----------------------------------------------------
CREATE POLICY "Allow users to access their own cart items"
  ON public.cart FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- 4. Wishlist Policies
-- ----------------------------------------------------
CREATE POLICY "Allow users to access their own wishlist"
  ON public.wishlist FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- 5. Orders & Order Items Policies
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own orders"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own orders"
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own order items"
  ON public.order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to insert their own order items"
  ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------
-- 6. Products, Categories, Brands & Settings (Public Read, Admin Write)
-- ----------------------------------------------------
CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Allow public read access to brands"
  ON public.brands FOR SELECT USING (true);

CREATE POLICY "Allow public read access to banners"
  ON public.banners FOR SELECT USING (true);

CREATE POLICY "Allow public read access to site_settings"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to read coupons"
  ON public.coupons FOR SELECT USING (auth.role() = 'authenticated');
```
