import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Package, MapPin, CreditCard, ChevronLeft, CheckCircle2, Clock,
  MessageSquare, X, AlertCircle, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Order } from '../../types/database'
import toast from 'react-hot-toast'

const STATUS_STEPS = [
  { key: 'confirmed',       label: 'Order Confirmed' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_done',    label: 'Payment Done' },
  { key: 'shipped',         label: 'Order Shipped' },
  { key: 'on_the_way',      label: 'Order On the Way' },
  { key: 'delivered',       label: 'Order Delivered' },
]

const STATUS_STYLES: Record<string, string> = {
  pending:         'bg-blue-100 text-blue-700',
  confirmed:       'bg-blue-100 text-blue-700',
  payment_pending: 'bg-amber-100 text-amber-700',
  payment_done:    'bg-emerald-100 text-emerald-700',
  shipped:         'bg-purple-100 text-purple-700',
  on_the_way:      'bg-orange-100 text-orange-700',
  delivered:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-700',
  returned:        'bg-gray-100 text-gray-700',
}

const COMPLAINT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:      { label: 'Open',      color: 'bg-red-100 text-red-700' },
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  resolved:  { label: 'Resolved',  color: 'bg-green-100 text-green-700' },
  closed:    { label: 'Closed',    color: 'bg-gray-100 text-gray-600' },
}

interface Complaint {
  id: string
  subject: string
  description: string
  status: string
  admin_reply: string | null
  created_at: string
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Complaint modal state
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(null)

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
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })

  const { data: complaints = [] } = useQuery({
    queryKey: ['order-complaints', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('order_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Complaint[]
    },
    enabled: !!id && !!user,
    refetchInterval: 20000,
  })

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('complaints').insert({
        user_id: user!.id,
        order_id: id,
        order_item_id: selectedItemId || null,
        subject: subject.trim(),
        description: description.trim(),
      })
      if (error) throw error
      toast.success('Complaint raised successfully! Our team will get back to you.')
      setShowComplaintModal(false)
      setSubject('')
      setDescription('')
      setSelectedItemId('')
      queryClient.invalidateQueries({ queryKey: ['order-complaints', id] })
      queryClient.invalidateQueries({ queryKey: ['complaints', user?.id] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to raise complaint')
    } finally {
      setSubmitting(false)
    }
  }

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

  const getStepIndex = (status: string) => {
    if (status === 'confirmed' || status === 'pending') return 0
    if (status === 'payment_pending') return 1
    if (status === 'payment_done') return 2
    if (status === 'shipped') return 3
    if (status === 'on_the_way') return 4
    if (status === 'delivered') return 5
    return -1
  }

  const currentStep = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'returned'
  const canRaiseComplaint = order.status !== 'pending'

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
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
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
                  <span className={`text-[9px] sm:text-[10px] mt-2 text-center font-semibold leading-tight max-w-[80px] ${
                    done ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
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
            const img = item.product?.images?.[0]?.image_url
            return (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.variant_label || `Size: ${item.size || ''}`} × {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 text-sm">
                  ₹{(item.total ?? item.subtotal ?? 0).toLocaleString('en-IN')}
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
              {address.city}, {address.state} — {address.postal_code}
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
              <span>₹{order.total.toLocaleString('en-IN')}</span>
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

      {/* ── Complaints Section ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <MessageSquare size={16} /> Complaints &amp; Support
            {complaints.length > 0 && (
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {complaints.length}
              </span>
            )}
          </h2>
          {canRaiseComplaint && (
            <button
              type="button"
              onClick={() => setShowComplaintModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white rounded-xl transition-colors"
            >
              <AlertCircle size={13} /> Raise a Complaint
            </button>
          )}
        </div>

        {complaints.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            {canRaiseComplaint
              ? 'No complaints raised yet. Use the button above if you have any concerns.'
              : 'Complaint can be raised once your order is confirmed.'}
          </p>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => {
              const cfg = COMPLAINT_STATUS_CONFIG[c.status] || COMPLAINT_STATUS_CONFIG.open
              const isExpanded = expandedComplaint === c.id
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedComplaint(isExpanded ? null : c.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">{c.subject}</span>
                    </div>
                    <ChevronRight size={14} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Your complaint</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.description}</p>
                      {c.admin_reply ? (
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <p className="text-xs font-bold text-blue-500 mb-1 flex items-center gap-1">
                            <MessageSquare size={10} /> Admin Reply
                          </p>
                          <p className="text-sm text-blue-800 leading-relaxed">{c.admin_reply}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Awaiting team response…</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Raise Complaint Modal ──────────────────────────────────────────── */}
      {showComplaintModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && setShowComplaintModal(false)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Raise a Complaint
              </h3>
              <button
                type="button"
                onClick={() => setShowComplaintModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              {/* Item select */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Related Item (optional)
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e] bg-white"
                >
                  <option value="">— Entire order —</option>
                  {items.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.product_name} ({item.variant_label || item.size || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Wrong size delivered, Item damaged..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Please describe your issue in detail..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#1a1a2e] hover:bg-[#e94560] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
