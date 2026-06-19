import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronRight, Package, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

interface Complaint {
  id: string
  order_id: string
  subject: string
  description: string
  status: 'open' | 'in_review' | 'resolved' | 'closed'
  admin_reply: string | null
  created_at: string
  orders: { order_number: string }
}

const STATUS_CONFIG = {
  open:      { label: 'Open',      color: 'bg-red-100 text-red-700',    icon: AlertCircle },
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolved:  { label: 'Resolved',  color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed:    { label: 'Closed',    color: 'bg-gray-100 text-gray-600',   icon: XCircle },
}

export default function ComplaintsPage() {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Complaint | null>(null)

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, orders(order_number)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Complaint[]
    },
    enabled: !!user,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            My Complaints
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track all your support requests and complaints</p>
        </div>
        <Link
          to="/orders"
          className="text-sm font-semibold text-[#e94560] hover:underline flex items-center gap-1"
        >
          <Package size={14} /> View Orders
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={56} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No complaints raised</h2>
          <p className="text-gray-400 mb-6">Have an issue with an order? Raise a complaint from the order details page.</p>
          <Link
            to="/orders"
            className="inline-block px-8 py-3 bg-[#1a1a2e] text-white font-semibold rounded-xl hover:bg-[#e94560] transition-colors"
          >
            View My Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open
            const Icon = cfg.icon
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        Order #{(c.orders as any)?.order_number}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm line-clamp-1">{c.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-gray-300 group-hover:text-[#e94560] transition-all shrink-0 mt-1 ${selected?.id === c.id ? 'rotate-90' : ''}`}
                  />
                </div>

                {/* Expanded detail */}
                {selected?.id === c.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-left space-y-3" onClick={e => e.stopPropagation()}>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Your complaint</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.description}</p>
                    </div>
                    {c.admin_reply && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <MessageSquare size={11} /> Admin Reply
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed">{c.admin_reply}</p>
                      </div>
                    )}
                    {!c.admin_reply && c.status === 'open' && (
                      <p className="text-xs text-gray-400 italic">Our team will review your complaint soon.</p>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
