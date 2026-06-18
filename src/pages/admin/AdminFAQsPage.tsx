import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, X, HelpCircle, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFaqs()
  }, [])

  const loadFaqs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setFaqs(data || [])
    } catch (err) {
      toast.error('Failed to load FAQs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq)
    setQuestion(faq.question)
    setAnswer(faq.answer)
    setCategory(faq.category || '')
    setSortOrder(faq.sort_order.toString())
    setIsActive(faq.is_active)
    setIsFormOpen(true)
  }

  const handleCreateNew = () => {
    setEditingFaq(null)
    setQuestion('')
    setAnswer('')
    setCategory('')
    setSortOrder(faqs.length.toString())
    setIsActive(true)
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !answer.trim()) {
      toast.error('Please enter both question and answer')
      return
    }

    setSaving(true)
    const faqData = {
      question,
      answer,
      category: category.trim() || 'General',
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive,
    }

    try {
      if (editingFaq) {
        const { error } = await supabase
          .from('faqs')
          .update(faqData)
          .eq('id', editingFaq.id)

        if (error) throw error
        toast.success('FAQ updated successfully')
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert(faqData)

        if (error) throw error
        toast.success('FAQ created successfully')
      }
      setIsFormOpen(false)
      loadFaqs()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save FAQ')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id)
      if (error) throw error
      toast.success('FAQ deleted successfully')
      loadFaqs()
    } catch (err: any) {
      toast.error('Failed to delete FAQ')
    }
  }

  const toggleFaqActive = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: !faq.is_active })
        .eq('id', faq.id)

      if (error) throw error
      toast.success(`FAQ marked as ${!faq.is_active ? 'active' : 'inactive'}`)
      loadFaqs()
    } catch (err: any) {
      toast.error('Failed to update FAQ status')
    }
  }

  // Extract unique categories for filtering
  const categories = Array.from(new Set(faqs.map(f => f.category).filter(Boolean)))

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory ? f.category === selectedCategory : true
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">FAQs</h1>
          <p className="text-slate-500 text-sm mt-1">Manage standard customer questions and accordion answers.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-3 rounded-xl font-semibold transition shadow"
        >
          <Plus size={18} />
          Add FAQ
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search FAQs by keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-slate-300 transition"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="text-slate-500 mt-2">Loading FAQ list...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
          <HelpCircle className="mx-auto mb-2 opacity-40" size={36} />
          <p>No FAQs found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 w-12">Order</th>
                  <th className="px-6 py-4">Question & Answer</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 w-28">Status</th>
                  <th className="px-6 py-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-slate-400 font-semibold">{faq.sort_order}</td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="font-bold text-slate-900 leading-snug">{faq.question}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{faq.answer}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wide text-xs">
                      {faq.category}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleFaqActive(faq)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          faq.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {faq.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(faq)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Slider Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/40" />

            <div className="relative w-full max-w-xl bg-white h-full flex flex-col shadow-2xl z-10 animate-slide-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold font-outfit text-slate-900">
                  {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                </h2>
                <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Question *</label>
                  <input
                    type="text"
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                    placeholder="e.g. How do I track my order?"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Answer *</label>
                  <textarea
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                    placeholder="Enter answer detail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                      placeholder="e.g. Orders, Shipping, Refund"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Sort Order</label>
                    <input
                      type="number"
                      required
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                      min="0"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="accent-slate-900 rounded"
                    />
                    Publish publicly (Active)
                  </label>
                </div>
              </form>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-1/2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  type="button"
                  disabled={saving}
                  className="w-1/2 bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow"
                >
                  {saving && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                  <Save size={18} />
                  Save FAQ
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
