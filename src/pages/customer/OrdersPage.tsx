import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Order } from '../../types/database'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
}

export default function OrdersPage() {
  const { user } = useAuthStore()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*, images:product_images(*))
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Order[]
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-36 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1
        className="text-3xl font-bold text-gray-900 mb-8"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        My Orders
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={56} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here!</p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3 bg-[#1a1a2e] text-white font-semibold rounded-xl hover:bg-[#e94560] transition-colors"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = (order as any).items || []
            const firstProduct = items[0]?.product
            const firstImage = firstProduct?.images?.[0]?.url

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {firstImage ? (
                      <img src={firstImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold text-gray-900 text-sm">
                        #{order.order_number}
                      </p>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                          STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                      {items.map((i: any) => i.product_name).join(', ')}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          ₹{order.total_amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-gray-400 group-hover:text-[#e94560] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
