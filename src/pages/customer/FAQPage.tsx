import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, HelpCircle, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const { data: faqs, isLoading } = useQuery<FAQ[]>({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as FAQ[]
    }
  })

  // Extract categories dynamically
  const categories = faqs ? Array.from(new Set(faqs.map(f => f.category).filter(Boolean))) : []

  const filteredFaqs = faqs?.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory ? faq.category === selectedCategory : true
    return matchesSearch && matchesCat
  })

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <HelpCircle size={48} className="text-[#e94560] mx-auto" />
          <h1 className="text-4xl font-extrabold text-[#1a1a2e] font-outfit">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Got questions? We've got answers. If you don't find what you are looking for, contact our support team.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] shadow-sm transition"
          />
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition ${
                selectedCategory === null
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              ALL
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition ${
                  selectedCategory === cat
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Accordion List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a2e]"></div>
            <p className="text-gray-500 mt-2 text-sm">Loading FAQs...</p>
          </div>
        ) : filteredFaqs?.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <MessageSquare size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No FAQs found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs?.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm transition hover:border-gray-300"
              >
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-semibold text-gray-900 focus:outline-none"
                >
                  <span className="text-sm sm:text-base leading-snug">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                      openId === faq.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openId === faq.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-1 text-sm text-gray-600 border-t border-gray-50 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
