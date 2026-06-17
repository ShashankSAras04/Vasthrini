// Database types matching the Supabase schema

export type UserRole = 'customer' | 'admin'
export type GenderType = 'women' | 'unisex' | 'kids' | 'boys' | 'girls'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'cod' | 'bank_transfer' | 'upi' | 'other'
export type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned'
export type DiscountType = 'percentage' | 'flat'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: UserRole
  profile_image: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  name: string
  logo: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id: string
  brand_id: string | null
  name: string
  slug: string
  description: string | null
  short_description?: string | null
  gender: GenderType
  price: number
  discount_price: number | null
  tags?: string[]
  stock: number
  sku?: string | null
  color?: string | null
  material?: string | null
  featured: boolean
  new_arrival: boolean
  best_seller: boolean
  is_active: boolean
  rating_avg: number
  rating_count: number
  created_at: string
  updated_at: string
  // Joined
  category?: Category
  brand?: Brand
  variants?: ProductVariant[]
  images?: ProductImage[]
}

export interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  color_hex: string | null
  sku: string
  stock_qty: number
  extra_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  country: string
  pincode: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  user_id: string
  variant_id: string
  quantity: number
  created_at: string
  updated_at: string
  // Joined
  variant?: ProductVariant & { product?: Product }
}

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  created_at: string
  // Joined
  product?: Product
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  subtotal: number
  discount_amount: number
  shipping_charge: number
  tax_amount: number
  total_amount: number
  coupon_id: string | null
  address_id: string | null
  notes: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  // Joined
  items?: OrderItem[]
  address?: Address
}

export interface OrderItem {
  id: string
  order_id: string
  variant_id: string
  product_id: string
  product_name: string
  variant_label: string
  unit_price: number
  quantity: number
  subtotal: number
  created_at: string
  // Joined
  variant?: ProductVariant
  product?: Product
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  usage_limit: number | null
  used_count: number
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  user_id: string
  product_id: string
  order_item_id: string | null
  rating: number
  title: string | null
  body: string | null
  is_verified: boolean
  created_at: string
  // Joined
  profile?: Profile
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      categories: { Row: Category; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      brands: { Row: Brand; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      products: { Row: Product; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      product_sizes: { Row: ProductVariant; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      product_images: { Row: ProductImage; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      addresses: { Row: Address; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      cart: { Row: CartItem; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      wishlist: { Row: WishlistItem; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      orders: { Row: Order; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      order_items: { Row: OrderItem; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      coupons: { Row: Coupon; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      reviews: { Row: Review; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      site_settings: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      banners: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      order_status_history: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}

