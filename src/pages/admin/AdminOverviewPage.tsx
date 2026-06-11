import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface DashboardStats {
  total_users: number
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_revenue: number
  pending_revenue: number
  total_products: number
  low_stock_products: number
  total_categories: number
  orders_today: number
  revenue_today: number
}

interface RecentOrder {
  id: string
  order_number: string
  created_at: string
  total: number
  order_status: string
  profiles: {
    first_name: string
    last_name: string
  }
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch RPC stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats')
      if (statsError) throw statsError
      setStats(statsData)

      // Fetch 5 recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total,
          order_status,
          profiles:user_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (ordersError) throw ordersError
      setRecentOrders((ordersData as any) || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${(stats?.total_revenue || 0).toLocaleString('en-IN')}`,
      subtext: `₹${(stats?.pending_revenue || 0).toLocaleString('en-IN')} pending`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Total Orders',
      value: stats?.total_orders || 0,
      subtext: `${stats?.pending_orders || 0} pending confirmation`,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Customers',
      value: stats?.total_users || 0,
      subtext: 'Registered users',
      icon: Users,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Low Stock Products',
      value: stats?.low_stock_products || 0,
      subtext: 'Stock level <= 5 items',
      icon: AlertTriangle,
      color: stats?.low_stock_products && stats.low_stock_products > 0
        ? 'bg-rose-50 text-rose-600 animate-pulse'
        : 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-outfit">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of your store's sales and activity.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4"
          >
            <div className={`p-3.5 rounded-xl ${kpi.color}`}>
              <kpi.icon size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-slate-950 font-outfit mt-1">{kpi.value}</h3>
              <p className="text-xs text-slate-500 mt-1.5">{kpi.subtext}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts & Activities Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Chart block */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Sales Trend</h3>
              <p className="text-xs text-slate-500">Visual visualization of sales transactions</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1 rounded-full">
              <TrendingUp size={14} />
              +14% this week
            </span>
          </div>

          {/* Simple Visual SVG Chart */}
          <div className="h-64 flex items-end justify-between px-2 pt-6 relative border-b border-l border-slate-100">
            {/* Grid Lines */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-slate-50 pointer-events-none"></div>
            <div className="absolute left-0 right-0 top-2/4 border-t border-slate-50 pointer-events-none"></div>
            <div className="absolute left-0 right-0 top-3/4 border-t border-slate-50 pointer-events-none"></div>

            <svg className="absolute inset-x-0 bottom-0 h-48 w-full text-blue-500/10" preserveAspectRatio="none">
              <path
                d="M0 150 C100 120, 200 40, 300 90 C400 120, 500 20, 600 0 L600 200 L0 200 Z"
                fill="currentColor"
              />
              <path
                d="M0 150 C100 120, 200 40, 300 90 C400 120, 500 20, 600 0"
                fill="none"
                stroke="rgb(59 130 246)"
                strokeWidth="3"
              />
            </svg>

            {/* Labels */}
            <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Store Health / Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg mb-4">Today's Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-sm text-slate-500 font-medium">Orders Placed</span>
                <span className="font-bold text-slate-900">{stats?.orders_today || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-sm text-slate-500 font-medium">Revenue Collected</span>
                <span className="font-bold text-slate-900">₹{(stats?.revenue_today || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                <span className="text-sm text-slate-500 font-medium">Pending Orders</span>
                <span className="font-bold text-slate-900">{stats?.pending_orders || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-slate-500 font-medium">Active Categories</span>
                <span className="font-bold text-slate-900">{stats?.total_categories || 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <Link
              to="/admin/products"
              className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-xl transition duration-200"
            >
              <span>Manage Store Inventory</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Recent Orders</h3>
            <p className="text-xs text-slate-500">The last 5 orders placed by customers.</p>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition"
          >
            View All Orders
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {order.profiles?.first_name} {order.profiles?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ₹{order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        order.order_status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.order_status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : order.order_status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {order.order_status === 'pending' && <Clock size={12} />}
                        {order.order_status === 'delivered' && <CheckCircle2 size={12} />}
                        {order.order_status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
