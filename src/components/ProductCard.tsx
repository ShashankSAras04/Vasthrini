import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import type { Product } from '../types/database'
import toast from 'react-hot-toast'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuthStore()
  const { addToCart } = useCartStore()
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlistStore()

  const primaryImage = product.images?.find((img) => img.is_primary) ?? product.images?.[0]
  const secondaryImage = product.images?.[1]
  const wishlisted = isWishlisted(product.id)

  const displayPrice = product.discount_price ?? product.price
  const hasDiscount = !!(product.discount_price && product.discount_price < product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - product.discount_price! / product.price) * 100)
    : 0

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) { toast.error('Please sign in first'); return }
    try {
      if (wishlisted) {
        await removeFromWishlist(user.id, product.id)
        toast.success('Removed from wishlist')
      } else {
        await addToWishlist(user.id, product.id)
        toast.success('Added to wishlist')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) { toast.error('Please sign in first'); return }

    // Add first available variant
    const firstVariant = product.variants?.[0]
    if (!firstVariant) {
      toast.error('Please select a variant')
      return
    }
    try {
      await addToCart(user.id, firstVariant.id)
      toast.success('Added to cart!')
    } catch {
      toast.error('Failed to add to cart')
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || product.name}
              className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <ShoppingBag size={40} className="text-gray-400" />
            </div>
          )}
          {secondaryImage && (
            <img
              src={secondaryImage.image_url}
              alt={secondaryImage.alt_text || product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.featured && (
              <span className="px-2 py-0.5 bg-[#1a1a2e] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Featured
              </span>
            )}
            {hasDiscount && (
              <span className="px-2 py-0.5 bg-[#e94560] text-white text-[10px] font-bold rounded-full">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Actions overlay */}
          <div className="absolute inset-0 flex flex-col items-end justify-end p-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleWishlist}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all ${
                wishlisted
                  ? 'bg-[#e94560] text-white'
                  : 'bg-white text-gray-700 hover:bg-[#e94560] hover:text-white'
              }`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleAddToCart}
              className="w-9 h-9 rounded-full bg-white text-gray-700 hover:bg-[#1a1a2e] hover:text-white flex items-center justify-center shadow-lg transition-all"
              aria-label="Add to cart"
            >
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          {product.brand && (
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              {product.brand.name}
            </p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs text-gray-600 font-medium">{product.rating_avg.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({product.rating_count})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">
              ₹{displayPrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
