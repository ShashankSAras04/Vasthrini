import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Ticket,
  Users, Settings, ChevronLeft, Menu, LogOut,
  ExternalLink, Bell, HelpCircle
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Products', href: '/admin/products', icon: ShoppingBag },
  { label: 'Orders', href: '/admin/orders', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: Tag },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/')
  }

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.href
    return location.pathname.startsWith(item.href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-gray-800">
        {sidebarOpen && (
          <span
            className="text-xl font-black text-white"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            VASTRINI
          </span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                {(sidebarOpen || mobileSidebarOpen) && (
                  <span>{item.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-sm font-medium"
        >
          <ExternalLink size={18} />
          {(sidebarOpen || mobileSidebarOpen) && <span>View Store</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          {(sidebarOpen || mobileSidebarOpen) && <span>Sign Out</span>}
        </button>

        {/* Profile */}
        {(sidebarOpen || mobileSidebarOpen) && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-gray-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile?.first_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-gray-500 text-xs truncate">{profile?.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden shrink-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-gray-900 border-r border-gray-800 md:hidden flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-white font-semibold text-sm sm:text-base">
                {navItems.find((i) => isActive(i))?.label || 'Dashboard'}
              </h1>
              <p className="text-gray-500 text-xs hidden sm:block">
                Vastrini Admin Panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
