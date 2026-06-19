import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Award,
  Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface AnalyticsKPI {
  revenue: number
  ordersCount: number
  aov: number
  cancelledCount: number
}

interface StatusBreakdown {
  status: string
  count: number
  percentage: number
  color: string
  label: string
}

interface TopProduct {
  productId: string
  name: string
  quantitySold: number
  revenue: number
  imageUrl: string | null
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [kpiToday, setKpiToday] = useState<AnalyticsKPI>({ revenue: 0, ordersCount: 0, aov: 0, cancelledCount: 0 })
  const [kpiWeek, setKpiWeek] = useState<AnalyticsKPI>({ revenue: 0, ordersCount: 0, aov: 0, cancelledCount: 0 })
  const [kpiMonth, setKpiMonth] = useState<AnalyticsKPI>({ revenue: 0, ordersCount: 0, aov: 0, cancelledCount: 0 })
  const [kpiYear, setKpiYear] = useState<AnalyticsKPI>({ revenue: 0, ordersCount: 0, aov: 0, cancelledCount: 0 })
  const [statuses, setStatuses] = useState<StatusBreakdown[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      // 1. Fetch all orders for grouping (or from start of year to optimize)
      const startOfYear = new Date(new Date().getFullYear(), 0, 1)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .gte('created_at', startOfYear.toISOString())

      if (ordersError) throw ordersError

      // Calculate time boundaries
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)) // Monday
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const calculateKPIForFiltered = (filteredOrders: any[]): AnalyticsKPI => {
        const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled')
        const revenue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        const ordersCount = activeOrders.length
        const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0
        const cancelledCount = filteredOrders.filter(o => o.status === 'cancelled').length
        return { revenue, ordersCount, aov, cancelledCount }
      }

      // Group orders by period
      const todayOrders = (orders || []).filter(o => new Date(o.created_at) >= startOfToday)
      const weekOrders = (orders || []).filter(o => new Date(o.created_at) >= startOfWeek)
      const monthOrders = (orders || []).filter(o => new Date(o.created_at) >= startOfMonth)
      const yearOrders = orders || []

      setKpiToday(calculateKPIForFiltered(todayOrders))
      setKpiWeek(calculateKPIForFiltered(weekOrders))
      setKpiMonth(calculateKPIForFiltered(monthOrders))
      setKpiYear(calculateKPIForFiltered(yearOrders))

      // 2. Orders-by-status breakdown
      const totalOrdersCount = (orders || []).length
      const statusMap: Record<string, { count: number; color: string; label: string }> = {
        pending: { count: 0, color: 'bg-yellow-500', label: 'Order Confirmed (Pending)' },
        confirmed: { count: 0, color: 'bg-blue-500', label: 'Order Confirmed' },
        payment_pending: { count: 0, color: 'bg-amber-500', label: 'Payment Pending' },
        payment_done: { count: 0, color: 'bg-emerald-500', label: 'Payment Done' },
        shipped: { count: 0, color: 'bg-purple-500', label: 'Order Shipped' },
        on_the_way: { count: 0, color: 'bg-orange-500', label: 'Order On the Way' },
        delivered: { count: 0, color: 'bg-green-500', label: 'Order Delivered' },
        cancelled: { count: 0, color: 'bg-rose-500', label: 'Cancelled' },
        returned: { count: 0, color: 'bg-slate-500', label: 'Returned' }
      }

      ;(orders || []).forEach(o => {
        if (statusMap[o.status]) {
          statusMap[o.status].count++
        }
      })

      const statusList: StatusBreakdown[] = Object.keys(statusMap).map(key => {
        const item = statusMap[key]
        return {
          status: key,
          count: item.count,
          percentage: totalOrdersCount > 0 ? Math.round((item.count / totalOrdersCount) * 100) : 0,
          color: item.color,
          label: item.label
        }
      }).sort((a, b) => b.count - a.count)

      setStatuses(statusList)

      // 3. Fetch order items for top-selling products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          product_name,
          quantity,
          subtotal,
          product:products(
            images:product_images(*)
          )
        `)
        .gte('created_at', startOfYear.toISOString())

      if (itemsError) throw itemsError

      // Aggregate top-selling products
      const productsMap: Record<string, { name: string; quantity: number; revenue: number; image: string | null }> = {}
      ;(orderItems || []).forEach((item: any) => {
        const pid = item.product_id
        if (!pid) return
        
        if (!productsMap[pid]) {
          // Extract primary or first product image if available
          let imageUrl: string | null = null
          if (item.product?.images && Array.isArray(item.product.images)) {
            const primaryImg = item.product.images.find((img: any) => img.is_primary)
            imageUrl = primaryImg ? primaryImg.image_url : (item.product.images[0]?.image_url ?? null)
          }

          productsMap[pid] = {
            name: item.product_name || 'Unknown Product',
            quantity: 0,
            revenue: 0,
            image: imageUrl
          }
        }
        productsMap[pid].quantity += item.quantity || 0
        productsMap[pid].revenue += (item.total ?? item.subtotal ?? 0)
      })

      const aggregatedProducts: TopProduct[] = Object.keys(productsMap).map(pid => {
        const p = productsMap[pid]
        return {
          productId: pid,
          name: p.name,
          quantitySold: p.quantity,
          revenue: p.revenue,
          imageUrl: p.image
        }
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)

      setTopProducts(aggregatedProducts)

    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load analytics data')
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

  const periods = [
    { title: 'Today', kpi: kpiToday, color: 'border-blue-100 bg-blue-50/20 text-blue-600' },
    { title: 'This Week', kpi: kpiWeek, color: 'border-purple-100 bg-purple-50/20 text-purple-600' },
    { title: 'This Month', kpi: kpiMonth, color: 'border-amber-100 bg-amber-50/20 text-amber-600' },
    { title: 'This Year', kpi: kpiYear, color: 'border-emerald-100 bg-emerald-50/20 text-emerald-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-outfit flex items-center gap-2">
            <Activity className="text-[#e94560]" size={28} />
            Analytics & Insights
          </h1>
          <p className="text-slate-500 text-sm mt-1">Detailed statistical evaluation of your store performance.</p>
        </div>
        <button
          type="button"
          onClick={loadAnalyticsData}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition bg-white shadow-sm"
        >
          <Sparkles size={16} className="text-[#e94560]" />
          Refresh Stats
        </button>
      </div>

      {/* 4 KPI Rows Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {periods.map((p, idx) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.title}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${p.color}`}>
                  Live
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-950 font-outfit mt-1">
                ₹{p.kpi.revenue.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {p.kpi.ordersCount} Orders Placed
              </p>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium">AOV</span>
                <p className="font-bold text-slate-800 mt-0.5">₹{p.kpi.aov.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium">Cancelled</span>
                <p className="font-bold text-rose-600 mt-0.5">{p.kpi.cancelledCount}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts & Top Products Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Orders by Status</h3>
            <p className="text-xs text-slate-500">Distribution breakdown across all stages</p>
          </div>

          <div className="space-y-4">
            {statuses.length === 0 || statuses.every(s => s.count === 0) ? (
              <p className="text-sm text-slate-400 text-center py-10">No orders tracked in this period.</p>
            ) : (
              statuses.map(s => {
                if (s.count === 0) return null
                return (
                  <div key={s.status} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{s.label}</span>
                      <span className="text-slate-900">{s.count} ({s.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color}`} style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top-selling products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Top Selling Products</h3>
              <p className="text-xs text-slate-500">Highest-performing products sorted by quantities sold</p>
            </div>
            <Award className="text-[#e94560]" size={20} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Product Details</th>
                  <th className="pb-3">Quantity Sold</th>
                  <th className="pb-3 text-right pr-2">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No sales records available yet.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product, index) => (
                    <tr key={product.productId} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pl-2 flex items-center gap-3">
                        <span className="text-xs font-extrabold text-slate-400 w-4">#{index + 1}</span>
                        <div className="w-10 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 text-xs">
                              👗
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-slate-800 line-clamp-1">{product.name}</span>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-600">{product.quantitySold} units</td>
                      <td className="py-3.5 text-right font-bold text-slate-950 pr-2">₹{product.revenue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
