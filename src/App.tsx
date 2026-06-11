import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { useCartStore } from './store/useCartStore'
import { useWishlistStore } from './store/useWishlistStore'

// Layouts
import CustomerLayout from './layouts/CustomerLayout'
import AdminLayout from './layouts/AdminLayout'

// Customer Pages
import HomePage from './pages/customer/HomePage'
import ShopPage from './pages/customer/ShopPage'
import ProductDetailPage from './pages/customer/ProductDetailPage'
import CartPage from './pages/customer/CartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import WishlistPage from './pages/customer/WishlistPage'
import OrdersPage from './pages/customer/OrdersPage'
import OrderDetailPage from './pages/customer/OrderDetailPage'
import ProfilePage from './pages/customer/ProfilePage'
import AuthPage from './pages/customer/AuthPage'

// Admin Pages
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminCouponsPage from './pages/admin/AdminCouponsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

// Guards
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AppContent() {
  const { setUser, setSession, setLoading, fetchProfile } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { fetchWishlist } = useWishlistStore()

  useEffect(() => {
    // Initialize auth
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id).catch(console.error)
          fetchCart(session.user.id).catch(console.error)
          fetchWishlist(session.user.id).catch(console.error)
        }
      })
      .catch((err) => {
        console.error('Error getting supabase session:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            await Promise.all([
              fetchProfile(session.user.id),
              fetchCart(session.user.id),
              fetchWishlist(session.user.id)
            ])
          } catch (err) {
            console.error('Error fetching user data on auth change:', err)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Routes */}
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="product/:slug" element={<ProductDetailPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route path="admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function SupabaseErrorScreen() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[#e94560]/20 text-[#e94560] flex items-center justify-center border border-[#e94560]/30 mx-auto text-3xl font-bold">
          ⚡
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Configuration Required</h1>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            Vastrini needs Supabase environment variables to connect to the database. These are currently missing on your live deployment.
          </p>
        </div>

        <div className="h-px bg-white/10 my-1" />

        <div className="text-left space-y-3 text-sm">
          <p className="font-semibold text-white/80">To fix this on Vercel:</p>
          <ol className="list-decimal pl-5 space-y-2 text-white/60">
            <li>Go to your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#e94560] hover:underline font-semibold">Vercel Project Dashboard</a>.</li>
            <li>Navigate to <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
            <li>Add <strong><code className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code></strong> with your Supabase API URL.</li>
            <li>Add <strong><code className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code></strong> with your Anon Public Key.</li>
            <li>Redeploy your project for the changes to take effect.</li>
          </ol>
        </div>

        <a
          href="https://github.com/ShashankSAras04/Vasthrini"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#e94560] hover:bg-[#c73652] text-white font-bold py-3.5 rounded-xl transition duration-300 shadow-lg shadow-[#e94560]/20 mt-2 block"
        >
          View Documentation
        </a>
      </div>
    </div>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseErrorScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
