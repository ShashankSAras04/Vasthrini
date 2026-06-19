import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Search, ChevronRight, X, Save,
  AlertCircle, Clock, CheckCircle2, XCircle, ExternalLink
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'closed'

interface Complaint {
  id: string
  user_id: string
  order_id: string
  order_item_id: string | null
  subject: string
  description: string
  status: ComplaintStatus
  admin_reply: string | null
  created_at: string
  updated_at: string
  orders: { order_number: string }
  profiles: { first_name: string; last_name: string; email: string }
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; icon: any }> = {
  open:      { label: 'Open',      color: 'bg-red-100 text-red-700',    icon: AlertCircle },
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolved:  { label: 'Resolved',  color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed:    { label: 'Closed',    color: 'bg-gray-100 text-gray-600',   icon: XCircle },
}

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [selected, setSelected] = useState<Complaint | null>(null)

  // Edit state
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('open')
  const [adminReply, setAdminReply] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadComplaints()

    // Realtime subscription for live updates
    const channel = supabase
      .channel('admin-complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel).catch(console.error) }
  }, [])

  const loadComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, orders(order_number), profiles:user_id(first_name, last_name, email)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setComplaints(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectComplaint = (c: Complaint) => {
    setSelected(c)
    setNewStatus(c.status)
    setAdminReply(c.admin_reply || '')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus, admin_reply: adminReply || null, updated_at: new Date().toISOString() })
        .eq('id', selected.id)
      if (error) throw error
      toast.success('Complaint updated')
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries({ queryKey: ['order-complaints', selected.order_id] })
      setSelected(null)
      loadComplaints()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const filtered = complaints.filter((c) => {
    const customerName = `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.toLowerCase()
    const matchesSearch =
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase()) ||
      (c.orders?.order_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter ? c.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  const counts = {
    open: complaints.filter(c => c.status === 'open').length,
    in_review: complaints.filter(c => c.status === 'in_review').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    closed: complaints.filter(c => c.status === 'closed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-outfit">Complaints & Support</h1>
        <p className="text-slate-500 text-sm mt-1">Manage customer complaints and provide resolutions.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [ComplaintStatus, typeof STATUS_CONFIG['open']][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`bg-white rounded-2xl p-4 border shadow-sm text-left transition-all ${
                statusFilter === key ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                <Icon size={16} className="text-slate-400" />
              </div>
              <p className="text-3xl font-black text-slate-900">{counts[key]}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by subject, customer or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-slate-300 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | '')}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">No complaints found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const cfg = STATUS_CONFIG[c.status]
              const Icon = cfg.icon
              const customerName = `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.trim() || 'Unknown'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectComplaint(c)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-slate-900 text-sm truncate">{c.subject}</p>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {customerName} · Order #{c.orders?.order_number} ·{' '}
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail / Edit Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:pr-6 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Complaint Details
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {`${selected.profiles?.first_name || ''} ${selected.profiles?.last_name || ''}`.trim()} ·{' '}
                  Order #{selected.orders?.order_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/orders/${selected.order_id}`}
                  target="_blank"
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                  title="View order"
                >
                  <ExternalLink size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Customer complaint */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Subject</p>
                <p className="text-sm font-semibold text-gray-900">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer's Description</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">
                  {selected.description}
                </p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Status update */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Update Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STATUS_CONFIG) as [ComplaintStatus, any][]).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewStatus(key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          newStatus === key
                            ? `${cfg.color} border-current`
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Admin reply */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Reply to Customer
                </label>
                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  rows={4}
                  placeholder="Write your response to the customer..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e] resize-none"
                />
              </div>
            </div>

            {/* Drawer footer */}
            <div className="p-6 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold rounded-xl transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
