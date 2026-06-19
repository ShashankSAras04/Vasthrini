import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ShoppingBag, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    document.title = 'Page Not Found - VASTRINI'
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F6F5F3] px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col items-center gap-8"
      >
        {/* Large visual icon */}
        <div className="w-20 h-20 rounded-full bg-[#E11D74]/10 text-[#E11D74] flex items-center justify-center text-4xl font-black">
          404
        </div>

        <div>
          <h1
            className="text-3xl font-black text-[#0E0E10] tracking-tight uppercase"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Lost in Style?
          </h1>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            The page you are looking for does not exist or has been moved. Use the search bar below to find your next look, or head back to our collections.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dresses, tops, activewear..."
            className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D74]/20 focus:border-[#E11D74] bg-[#F6F5F3]"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 p-2 text-gray-400 hover:text-[#E11D74] transition-colors"
          >
            <Search size={18} />
          </button>
        </form>

        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <Link
            to="/shop"
            className="flex-1 py-3 px-6 bg-[#0E0E10] text-white text-sm font-bold rounded-full hover:bg-[#E11D74] transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 duration-200"
          >
            <ShoppingBag size={16} />
            Shop Collections
          </Link>
          <button
            onClick={() => navigate(-1)}
            type="button"
            className="flex-1 py-3 px-6 border border-gray-200 text-[#0E0E10] text-sm font-bold rounded-full hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95 duration-200"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  )
}
