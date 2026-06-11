import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket, Plus, Search, Edit2, Trash2, X, EyeOff,
  Calendar, Percent, DollarSign, Hash, Copy, CheckCircle2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import type { Coupon, DiscountType } from '../../types/database'

interface CouponForm {
  code: string
  description: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  usage_limit: number | null
  is_active: boolean
  starts_at: string
  expires_at: string
}

const emptyCoupon: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: null,
  usage_limit: null,
  is_active: true,
  starts_at: '',
  expires_at: '',
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponForm>(emptyCoupon)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCoupons(data || [])
    } catch (err: any) {
      toast.error('Failed to load coupons')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditing(coupon)
      setForm({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount,
        max_discount_amount: coupon.max_discount_amount,
        usage_limit: coupon.usage_limit,
        is_active: coupon.is_active,
        starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : '',
        expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : '',
      })
    } else {
      setEditing(null)
      setForm(emptyCoupon)
    }
    setModalOpen(true)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'VAST'
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    setForm({ ...form, code })
  }

  const saveCoupon = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required')
      return
    }
    if (form.discount_value <= 0) {
      toast.error('Discount value must be greater than 0')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount,
        max_discount_amount: form.max_discount_amount,
        usage_limit: form.usage_limit,
        is_active: form.is_active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }
      if (editing) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Coupon updated')
      } else {
        const { error } = await supabase.from('coupons').insert(payload)
        if (error) throw error
        toast.success('Coupon created')
      }
      setModalOpen(false)
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) throw error
      toast.success('Coupon deleted')
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id)
      if (error) throw error
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated')
      fetchCoupons()
    } catch (err: any) {
      toast.error('Failed to update')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied: ${code}`)
  }

  const isExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false
    return new Date(coupon.expires_at) < new Date()
  }

  const isUsageFull = (coupon: Coupon) => {
    if (!coupon.usage_limit) return false
    return coupon.used_count >= coupon.usage_limit
  }

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">Coupons</h1>
          <p className="text-slate-500 text-sm mt-1">
            Create and manage promotional coupon codes.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          Create Coupon
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Coupons', value: coupons.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: coupons.filter((c) => c.is_active && !isExpired(c)).length, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Expired', value: coupons.filter((c) => isExpired(c)).length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Fully Used', value: coupons.filter((c) => isUsageFull(c)).length, color: 'bg-rose-50 text-rose-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${stat.color}`}>
              {stat.value}
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      {/* Coupons Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Min Order</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Ticket size={32} className="mx-auto mb-2 opacity-40" />
                    No coupons found.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon, idx) => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {coupon.discount_type === 'percentage' ? (
                          <><Percent size={12} className="text-blue-500" /> Percentage</>
                        ) : (
                          <><DollarSign size={12} className="text-emerald-500" /> Flat</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}%`
                        : `₹${coupon.discount_value}`}
                      {coupon.max_discount_amount && (
                        <span className="text-xs text-slate-400 ml-1">
                          (max ₹{coupon.max_discount_amount})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      ₹{coupon.min_order_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold ${isUsageFull(coupon) ? 'text-rose-600' : 'text-slate-600'}`}>
                        {coupon.used_count} / {coupon.usage_limit || '∞'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {coupon.expires_at ? (
                        <span className={isExpired(coupon) ? 'text-rose-500 line-through' : ''}>
                          {new Date(coupon.expires_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          isExpired(coupon)
                            ? 'bg-rose-50 text-rose-600'
                            : coupon.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {isExpired(coupon) ? (
                          <><Calendar size={12} /> Expired</>
                        ) : coupon.is_active ? (
                          <><CheckCircle2 size={12} /> Active</>
                        ) : (
                          <><EyeOff size={12} /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(coupon)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteCoupon(coupon.id)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? 'Edit Coupon' : 'Create Coupon'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Coupon Code *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="e.g. SAVE20"
                    />
                    <button
                      onClick={generateCode}
                      className="px-3 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
                    >
                      <Hash size={14} className="inline mr-1" />
                      Generate
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="e.g. Summer Sale 2026"
                  />
                </div>

                {/* Type + Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Discount Type
                    </label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Value *
                    </label>
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      min={0}
                    />
                  </div>
                </div>

                {/* Min Order + Max Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Min Order (₹)
                    </label>
                    <input
                      type="number"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={form.max_discount_amount ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="No limit"
                      min={0}
                    />
                  </div>
                </div>

                {/* Usage Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={form.usage_limit ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, usage_limit: e.target.value ? parseInt(e.target.value) : null })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Unlimited"
                    min={0}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Starts At
                    </label>
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <button
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                      form.is_active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {form.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCoupon}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
