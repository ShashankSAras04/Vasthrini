import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, Heart, User, Search, Menu, X, ChevronDown,
  LogOut, Package, Shield, MessageSquare
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import { useSettingsStore } from '../store/useSettingsStore'
import toast from 'react-hot-toast'

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const navLinks = [
  { label: 'New Arrivals', href: '/shop?filter=new' },
  { label: 'Women', href: '/shop?gender=Women' },
  { label: 'Kids', href: '/shop?gender=Kids' },
  { label: 'Sale', href: '/shop?filter=sale' },
]

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const { user, profile, signOut } = useAuthStore()
  const { getTotalItems } = useCartStore()
  const { items: wishlistItems } = useWishlistStore()
  const { settings } = useSettingsStore()

  useEffect(() => {
    if (settings) {
      document.title = settings.store_name || 'VASTRINI'
      if (settings.favicon_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'shortcut icon'
          document.head.appendChild(link)
        }
        link.href = settings.favicon_url
      }
    }
  }, [settings])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    toast.success('Signed out successfully')
    navigate('/')
  }

  const cartCount = getTotalItems()
  const wishlistCount = wishlistItems.length

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Announcement bar */}
      {settings?.announcement_enabled && (
        <div
          style={{ backgroundColor: settings.announcement_bg, color: settings.announcement_fg }}
          className="text-xs py-2 px-4 overflow-hidden relative w-full border-b border-black/10 select-none"
        >
          <div
            className="animate-marquee font-semibold"
            style={{ '--marquee-duration': `${settings.announcement_speed || 20}s` } as React.CSSProperties}
          >
            <span className="px-8">{settings.announcement_text}</span>
            <span className="px-8">{settings.announcement_text}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-white'
        } border-b border-gray-100`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={settings.store_name} className="h-9 object-contain" />
              ) : (
                <span
                  className="text-2xl font-black tracking-tight"
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {settings?.store_name || 'VASTRINI'}
                </span>
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-[#e94560] ${
                    location.pathname === link.href.split('?')[0]
                      ? 'text-[#e94560]'
                      : 'text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search size={20} className="text-gray-700" />
              </button>

              {/* Wishlist */}
              <Link
                to={user ? '/wishlist' : '/auth'}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart size={20} className="text-gray-700" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e94560] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to={user ? '/cart' : '/auth'}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingBag size={20} className="text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e94560] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* User */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#e94560] flex items-center justify-center text-white text-xs font-bold">
                      {profile?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-gray-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                      >
                        <div className="p-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {profile?.first_name} {profile?.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User size={15} /> My Profile
                          </Link>
                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Package size={15} /> My Orders
                          </Link>
                          <Link
                            to="/complaints"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <MessageSquare size={15} /> My Complaints
                          </Link>
                          {profile?.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Shield size={15} /> Admin Panel
                            </Link>
                          )}
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-medium rounded-full hover:bg-[#e94560] transition-colors"
                >
                  <User size={15} /> Sign In
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#e94560] hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <Link
                    to="/auth"
                    className="mt-2 px-4 py-2.5 bg-[#1a1a2e] text-white text-sm font-medium rounded-xl text-center"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSearch} className="flex items-center px-4">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands, categories..."
                  className="flex-1 px-4 py-4 text-base text-gray-900 outline-none bg-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span
                className="text-2xl font-black"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {settings?.store_name || 'VASTRINI'}
              </span>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">
                Premium clothing for everyone. Inspired by fashion, built for comfort.
              </p>
              {settings?.social_enabled && (
                <div className="flex gap-4 mt-4">
                  {settings.instagram_url && (
                    <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                      <InstagramIcon size={18} />
                    </a>
                  )}
                  {settings.facebook_url && (
                    <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                      <FacebookIcon size={18} />
                    </a>
                  )}
                  {settings.whatsapp_number && (
                    <a
                      href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="WhatsApp"
                    >
                      <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18" className="inline-block align-middle">
                        <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.761.46 3.475 1.332 4.988L2 22l5.176-1.356c1.47.8 3.11 1.222 4.79 1.222 5.506 0 10-4.482 10-9.988 0-5.506-4.494-9.988-10-9.988zm6.54 14.154c-.269.761-1.356 1.482-1.872 1.583-.493.1-1.132.185-3.269-.7-2.735-1.129-4.5-3.918-4.636-4.1-.135-.182-1.1-1.466-1.1-2.793 0-1.328.694-1.98.943-2.247.248-.269.544-.336.726-.336.182 0 .363.003.522.01.166.007.387-.063.606.467.227.549.774 1.884.842 2.022.069.138.113.3.02.484-.093.185-.141.3-.278.462-.138.16-.29.358-.415.48-.138.136-.282.285-.122.56.16.273.71 1.171 1.523 1.894.813.722 1.5.946 1.713 1.05.213.104.339.088.465-.057.126-.145.544-.633.69-.85.145-.216.29-.18.493-.105.203.076 1.29.61 1.512.72.222.11.37.165.425.26.056.095.056.551-.213 1.312z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Shop</h4>
              <ul className="space-y-2.5">
                {['Women', 'Kids', 'New Arrivals', 'Sale'].map((item) => (
                  <li key={item}>
                    <Link
                      to={`/shop?gender=${item.toLowerCase()}`}
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Help</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/complaints" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Raise a Complaint
                  </Link>
                </li>
                <li>
                  <span
                    onClick={() => toast.error('No Returns Policy: All sales are final.', { duration: 5000 })}
                    className="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors"
                  >
                    No Returns Policy
                  </span>
                </li>
                <li>
                  <Link to="/faq" className="text-gray-400 text-sm hover:text-white transition-colors">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Stay Connected</h4>
              <p className="text-gray-400 text-sm mb-4">Subscribe for exclusive deals and style updates.</p>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-white/10 text-white text-sm rounded-lg border border-white/20 placeholder:text-gray-500 focus:outline-none focus:border-[#e94560]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e94560] text-white text-sm font-medium rounded-lg hover:bg-[#c73652] transition-colors"
                >
                  Go
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} VASTRINI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 text-sm">Privacy Policy</span>
              <span className="text-gray-500 text-sm">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
