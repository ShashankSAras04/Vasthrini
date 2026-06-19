import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Heart, ShoppingBag, Plus, Minus,
  Share2, Package, RotateCcw, Shield, Truck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { useCartStore } from '../../store/useCartStore'
import { useWishlistStore } from '../../store/useWishlistStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import ProductCard from '../../components/ProductCard'
import type { Product, ProductVariant } from '../../types/database'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToCart } = useCartStore()
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlistStore()
  const { settings } = useSettingsStore()

  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)

  const freeShippingThreshold = settings?.free_shipping_threshold ?? 999

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          category:categories(*),
          brand:brands(*),
          variants:product_sizes(*),
          reviews:reviews(*, profile:profiles(*))
        `)
        .eq('slug', slug!)
        .single()
      if (error) throw error
      return data as Product
    },
    enabled: !!slug,
  })

  useEffect(() => {
    if (product) {
      document.title = `${product.name} - VASTRINI`
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.setAttribute('name', 'description')
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute('content', product.description || `Buy ${product.name} online at VASTRINI.`)
    }
  }, [product])

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(*), brand:brands(*)')
        .eq('category_id', product!.category_id)
        .eq('is_active', true)
        .neq('id', product!.id)
        .limit(4)
      if (error) throw error
      return data as Product[]
    },
    enabled: !!product?.category_id,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="skeleton rounded-2xl aspect-square" />
          <div className="space-y-4">
            <div className="skeleton h-6 rounded-lg w-1/3" />
            <div className="skeleton h-10 rounded-lg w-3/4" />
            <div className="skeleton h-8 rounded-lg w-1/4" />
            <div className="skeleton h-32 rounded-lg" />
            <div className="skeleton h-14 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Product not found</h2>
        <Link to="/shop" className="mt-4 inline-block text-[#e94560] underline">
          Back to Shop
        </Link>
      </div>
    )
  }

  const images = [...(product.images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
  const variants = product.variants ?? []
  const reviews = (product as any).reviews ?? []

  // product_sizes schema: { id, product_id, size, quantity }
  const availableSizes = variants.map((v: ProductVariant) => ({
    id: v.id,
    size: v.size,
    stock: (v as any).quantity ?? v.stock_qty ?? 0,
  }))

  const selectedVariant = availableSizes.find(v => v.size === selectedSize)

  const displayPrice = product.discount_price ?? product.price
  const hasDiscount = !!(product.discount_price && product.discount_price < product.price)
  const discountPct = hasDiscount && product.price > 0
    ? Math.round((1 - product.discount_price! / product.price) * 100)
    : 0

  const wishlisted = isWishlisted(product.id)

  const handleAddToCart = async () => {
    if (!user) { toast.error('Please sign in first'); navigate('/auth'); return }
    if (!selectedSize) { toast.error('Please select a size'); return }
    const variant = availableSizes.find(v => v.size === selectedSize)
    if (!variant) { toast.error('Size not available'); return }
    setAddingToCart(true)
    try {
      await addToCart(user.id, variant.id, quantity)
      toast.success('Added to cart!')
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleWishlist = async () => {
    if (!user) { toast.error('Please sign in first'); navigate('/auth'); return }
    try {
      if (wishlisted) {
        await removeFromWishlist(user.id, product.id)
        toast.success('Removed from wishlist')
      } else {
        await addToWishlist(user.id, product.id)
        toast.success('Added to wishlist!')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : (product.rating_avg || 0)

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-[#e94560] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#e94560] transition-colors">Shop</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                to={`/shop?category=${product.category.slug}`}
                className="hover:text-[#e94560] transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      {/* Main product section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Images */}
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-square mb-4">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={images[activeImage]?.image_url}
                  alt={images[activeImage]?.alt_text || product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=60';
                  }}
                />
              </AnimatePresence>

              {/* Discount badge */}
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-[#e94560] text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discountPct}%
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-[#e94560]' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=60';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {product.brand && (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                {product.brand.name}
              </p>
            )}

            <h1
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={16}
                    className={n <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {avgRating.toFixed(1)} ({reviews.length || product.rating_count || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-gray-900">
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <span className="text-xl text-gray-400 line-through">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
              )}
              {hasDiscount && (
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Save {discountPct}%
                </span>
              )}
            </div>

            {/* Size Selector — product_sizes has size + quantity only (no color) */}
            {availableSizes.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Size:{' '}
                    <span className="font-normal text-gray-500">{selectedSize || 'Select'}</span>
                  </p>
                  <button type="button" className="text-xs text-[#e94560] underline">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(({ size, stock }) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={stock === 0}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white'
                          : stock === 0
                          ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            {selectedVariant && selectedVariant.stock < 5 && selectedVariant.stock > 0 && (
              <p className="text-sm text-[#e94560] font-semibold mb-4">
                ⚡ Only {selectedVariant.stock} left in stock!
              </p>
            )}
            {selectedVariant && selectedVariant.stock === 0 && (
              <p className="text-sm text-gray-500 font-semibold mb-4">Out of stock</p>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <p className="text-sm font-semibold text-gray-700">Quantity:</p>
              <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(q + 1, selectedVariant?.stock ?? 99))}
                  disabled={!!selectedVariant && quantity >= selectedVariant.stock}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mb-8">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart || (selectedVariant?.stock === 0)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#1a1a2e] text-white font-bold text-base rounded-2xl hover:bg-[#e94560] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToCart ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${
                  wishlisted
                    ? 'border-[#e94560] bg-[#e94560] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-[#e94560] hover:text-[#e94560]'
                }`}
              >
                <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
              <button type="button" className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-gray-200 text-gray-700 hover:border-gray-400 transition-all">
                <Share2 size={20} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: Truck, label: 'Free Delivery', sub: `Orders over ₹${freeShippingThreshold}` },
                { icon: RotateCcw, label: 'No Returns Policy', sub: 'All sales final' },
                { icon: Shield, label: 'Secure Payment', sub: '100% protected' },
                { icon: Package, label: 'Premium Quality', sub: 'Verified products' },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
                >
                  <badge.icon size={18} className="text-[#1a1a2e] shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{badge.label}</p>
                    <p className="text-[10px] text-gray-500">{badge.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-16">
            <h2
              className="text-2xl font-bold text-gray-900 mb-8"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Customer Reviews
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review: any) => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{review.title}</h4>
                  )}
                  {review.body && (
                    <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#e94560] flex items-center justify-center text-white text-[10px] font-bold">
                      {review.profile?.first_name?.[0] || 'U'}
                    </div>
                    <span className="text-xs text-gray-500">
                      {review.profile?.first_name || 'Customer'}{' '}
                      {review.is_verified && (
                        <span className="text-green-600 font-medium">✓ Verified</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2
              className="text-2xl font-bold text-gray-900 mb-8"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
