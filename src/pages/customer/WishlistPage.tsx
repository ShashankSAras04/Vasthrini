import { motion } from 'framer-motion'
import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlistStore } from '../../store/useWishlistStore'
import ProductCard from '../../components/ProductCard'

export default function WishlistPage() {
  const { items, loading } = useWishlistStore()

  // Filter items with valid products
  const validItems = items.filter(item => item.product)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24 pb-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a2e] mb-4"></div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Heart className="text-[#e94560] fill-[#e94560]" size={28} />
          <h1 className="text-3xl font-bold font-outfit text-[#1a1a2e]">My Wishlist</h1>
          <span className="bg-[#1a1a2e] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {validItems.length} {validItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {validItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto"
          >
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="text-[#e94560]" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">
              Save items you love here to find them easily when you are ready to shop.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white font-semibold px-6 py-3 rounded-xl transition duration-300"
            >
              <ShoppingBag size={18} />
              Continue Shopping
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {validItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                {/* ProductCard expects a Product. Ensure images & variants are on product if joined */}
                <ProductCard product={item.product!} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
