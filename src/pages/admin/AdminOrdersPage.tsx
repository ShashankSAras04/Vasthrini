import { useState, useEffect } from 'react'
import { Search, Clock, CheckCircle2, ChevronRight, X, Landmark, Truck, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Order, OrderStatus, PaymentStatus } from '../../types/database'
import toast from 'react-hot-toast'

interface OrderHistoryItem {
  status: string
  remarks: string | null
  created_at: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [statusHistory, setStatusHistory] = useState<OrderHistoryItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Edit fields
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [adminNotes, setAdminNotes] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:user_id(first_name, last_name, email)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err: any) {
      toast.error('Failed to load orders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order)
    setOrderStatus(order.status)
    setPaymentStatus(order.payment_status)
    setAdminNotes(order.notes || '')
    setTrackingNumber(order.tracking_number || '')
    setRemarks('')
    setDetailLoading(true)

    try {
      // Fetch RPC get_order_summary for full details
      const { data, error } = await supabase.rpc('get_order_summary', { p_order_id: order.id })
      if (error) throw error

      if (data) {
        setOrderItems(data.items || [])
        setStatusHistory(data.status_history || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load order items')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          payment_status: paymentStatus,
          notes: adminNotes || null,
          tracking_number: trackingNumber || null,
        })
        .eq('id', selectedOrder.id)

      if (error) throw error

      // If remarks are entered, log it in status history if status did not change,
      // (Postgres trigger auto-logs on status change but we can add remarks via trigger by changing auth context or manual logging).
      // Let's add a manual status history if remarks exist
      if (remarks.trim()) {
        await supabase.from('order_status_history').insert({
          order_id: selectedOrder.id,
          status: orderStatus,
          remarks: remarks
        })
      }

      toast.success('Order updated successfully')
      setSelectedOrder(null)
      loadOrders()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order')
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o as any).profiles?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o as any).profiles?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter ? o.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-outfit">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Fulfill orders, track shipping, and manage transaction statuses.</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by order number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-slate-300 transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Order Confirmed (Pending)</option>
          <option value="confirmed">Order Confirmed</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="payment_done">Payment Done</option>
          <option value="shipped">Order Shipped</option>
          <option value="on_the_way">Order On the Way</option>
          <option value="delivered">Order Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="text-slate-500 mt-2">Loading orders...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Fulfillment</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No orders found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{o.order_number}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">
                        {(o as any).profiles?.first_name} {(o as any).profiles?.last_name}
                        <p className="text-xs text-slate-400 font-normal">{(o as any).profiles?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(o.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          o.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : o.payment_status === 'refunded'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {o.payment_status.toUpperCase()}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{o.payment_method}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-955">₹{o.total.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          o.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : (o.status === 'pending' || o.status === 'confirmed')
                            ? 'bg-blue-50 text-blue-700'
                            : o.status === 'payment_pending'
                            ? 'bg-amber-50 text-amber-700'
                            : o.status === 'payment_done'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'shipped'
                            ? 'bg-purple-50 text-purple-700'
                            : o.status === 'on_the_way'
                            ? 'bg-orange-50 text-orange-700'
                            : o.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-50 text-slate-700'
                        }`}>
                          {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'payment_pending') && <Clock size={12} />}
                          {o.status === 'delivered' && <CheckCircle2 size={12} />}
                          {o.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSelectOrder(o)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition ml-auto"
                        >
                          Fulfill
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer Details overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/40" />

          <div className="relative w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl z-10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold font-outfit text-slate-900">Fulfill {selectedOrder.order_number}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Placed: {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleUpdateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer summary */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer</h4>
                  <p className="font-bold text-slate-900">{(selectedOrder as any).profiles?.first_name} {(selectedOrder as any).profiles?.last_name}</p>
                  <p className="text-sm text-slate-500">{(selectedOrder as any).profiles?.email}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Method</h4>
                  <p className="text-sm font-semibold uppercase text-slate-800 flex items-center gap-1.5 mt-1">
                    <Landmark size={15} />
                    {selectedOrder.payment_method}
                  </p>
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Items Summary</h4>
                {detailLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="p-4 flex gap-3 items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                            {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{item.product_name}</p>
                            <p className="text-xs text-slate-500">Size: {item.size} · Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-bold text-slate-950">₹{item.total.toLocaleString('en-IN')}</p>
                      </div>
                    ))}

                    <div className="p-4 bg-slate-50/50 space-y-2 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-slate-900">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>- ₹{selectedOrder.discount_amount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery</span>
                        <span className="text-slate-900">₹{selectedOrder.shipping_charge.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-950 pt-2 border-t border-slate-100">
                        <span>Total Amount</span>
                        <span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status form fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fulfillment Status</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="pending">Order Confirmed (Pending)</option>
                    <option value="confirmed">Order Confirmed</option>
                    <option value="payment_pending">Payment Pending</option>
                    <option value="payment_done">Payment Done</option>
                    <option value="shipped">Order Shipped</option>
                    <option value="on_the_way">Order On the Way</option>
                    <option value="delivered">Order Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Courier / Tracking Number</label>
                <div className="relative">
                  <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking ID (e.g. DELHIVERY12345)"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status Log Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Dispatched from primary hub"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Notes (internal)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add private note (visible to admins only)"
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Status Audit Trail */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Audit Trail</h4>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                  {statusHistory.map((history, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0"></div>
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{history.status}</p>
                        {history.remarks && <p className="text-slate-500 mt-0.5 font-medium">{history.remarks}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(history.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-1/2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrder}
                type="button"
                disabled={updating}
                className="w-1/2 bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow"
              >
                {updating && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                <Save size={18} />
                Save Fulfillment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
