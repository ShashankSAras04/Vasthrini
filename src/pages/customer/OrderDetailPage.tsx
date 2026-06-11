import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, MapPin, CreditCard, ChevronLeft, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Order } from '../../types/database'

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*, product:products(*, images:product_images(*))),
          address:addresses(*)
        `)
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as Order
    },
    enabled: !!id && !!user,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (!order) return (
    <div className="text-center py-20">
      <Package size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600">Order not found</p>
      <Link to="/orders" className="mt-4 inline-block text-[#e94560] underline">View all orders</Link>
    </div>
  )

  const items = (order as any).items || []
  const address = (order as any).address
  const currentStep = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'returned'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/orders"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <ChevronLeft size={16} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Order #{order.order_number}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <span
          className={`text-sm font-semibold px-4 py-1.5 rounded-full capitalize ${
            STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-5 text-sm">Tracking</h2>
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep
              const active = i === currentStep
              return (
                <div key={step} className="flex-1 flex flex-col items-center relative">
                  {/* Line */}
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-0.5 ${
                        i < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 relative border-2 transition-colors ${
                      done
                        ? active
                          ? 'bg-[#1a1a2e] border-[#1a1a2e]'
                          : 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {done && !active ? (
                      <CheckCircle2 size={16} className="text-white" />
                    ) : active ? (
                      <Clock size={14} className="text-white" />
                    ) : null}
                  </div>
                  <span className={`text-[10px] mt-2 text-center font-medium capitalize ${
                    done ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
              )
            })}
          </div>
          {order.tracking_number && (
            <p className="mt-4 text-sm text-gray-600">
              Tracking: <span className="font-medium text-gray-900">{order.tracking_number}</span>
            </p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
          <Package size={16} /> Order Items ({items.length})
        </h2>
        <div className="space-y-4">
          {items.map((item: any) => {
            const img = item.product?.images?.[0]?.url
            return (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.variant_label} × {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 text-sm">
                  ₹{item.subtotal.toLocaleString('en-IN')}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Address & Payment row */}
      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        {address && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={14} /> Delivery Address
            </h3>
            <p className="text-sm font-medium text-gray-800">{address.full_name}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''},{' '}
              {address.city}, {address.state} — {address.pincode}
            </p>
            <p className="text-sm text-gray-500 mt-1">📞 {address.phone}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard size={14} /> Payment Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{order.discount_amount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{order.shipping_charge === 0 ? 'Free' : `₹${order.shipping_charge}`}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span>₹{order.total_amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-600 mt-2">
              <span>Payment Method</span>
              <span className="capitalize font-medium">{order.payment_method.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment Status</span>
              <span className={`font-medium capitalize ${
                order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {order.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
