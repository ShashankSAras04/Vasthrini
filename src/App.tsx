import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { useCartStore } from './store/useCartStore'
import { useWishlistStore } from './store/useWishlistStore'
import { useSettingsStore } from './store/useSettingsStore'
import ErrorBoundary from './components/ErrorBoundary'

// Layouts (not lazy — tiny, needed immediately)
import CustomerLayout from './layouts/CustomerLayout'
import AdminLayout from './layouts/AdminLayout'

// Guards
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

// ─── Lazy-loaded Customer Pages ───────────────────────────────────────────────
const HomePage          = lazy(() => import('./pages/customer/HomePage'))
const ShopPage          = lazy(() => import('./pages/customer/ShopPage'))
const ProductDetailPage = lazy(() => import('./pages/customer/ProductDetailPage'))
const CartPage          = lazy(() => import('./pages/customer/CartPage'))
const CheckoutPage      = lazy(() => import('./pages/customer/CheckoutPage'))
const WishlistPage      = lazy(() => import('./pages/customer/WishlistPage'))
const OrdersPage        = lazy(() => import('./pages/customer/OrdersPage'))
const OrderDetailPage   = lazy(() => import('./pages/customer/OrderDetailPage'))
const ProfilePage       = lazy(() => import('./pages/customer/ProfilePage'))
const AuthPage          = lazy(() => import('./pages/customer/AuthPage'))
const FAQPage           = lazy(() => import('./pages/customer/FAQPage'))
const NotFoundPage      = lazy(() => import('./pages/customer/NotFoundPage'))

// ─── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
const AdminOverviewPage   = lazy(() => import('./pages/admin/AdminOverviewPage'))
const AdminProductsPage   = lazy(() => import('./pages/admin/AdminProductsPage'))
const AdminOrdersPage     = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'))
const AdminCouponsPage    = lazy(() => import('./pages/admin/AdminCouponsPage'))
const AdminUsersPage      = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminSettingsPage   = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminFAQsPage       = lazy(() => import('./pages/admin/AdminFAQsPage'))
const AdminAnalyticsPage  = lazy(() => import('./pages/admin/AdminAnalyticsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#e94560] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppContent() {
  const { setUser, setSession, setLoading, fetchProfile } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { fetchWishlist } = useWishlistStore()
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    fetchSettings().catch(console.error)
    // Initialize auth from existing session
    supabase.auth.getSession()
      .then(({ data: { session } }: any) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id).catch(console.error)
          fetchCart(session.user.id).catch(console.error)
          fetchWishlist(session.user.id).catch(console.error)
        }
      })
      .catch((err: any) => {
        console.error('Error getting supabase session:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
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
        } else {
          // User signed out — clear cart and wishlist
          useCartStore.setState({ items: [] })
          useWishlistStore.setState({ items: [] })
        }
      }
    )

    // Re-validate session on tab focus (catches expired JWT)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }: any) => {
          if (!session) {
            setUser(null)
            setSession(null)
            useCartStore.setState({ items: [] })
            useWishlistStore.setState({ items: [] })
          }
        }).catch(console.error)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:slug" element={<ProductDetailPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="faq" element={<FAQPage />} />
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
              <Route path="faqs" element={<AdminFAQsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

export default App
