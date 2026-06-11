import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag, Plus, Search, Edit2, Trash2, X, Eye, EyeOff,
  Layers, Image as ImageIcon
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import type { Category, Brand } from '../../types/database'

type Tab = 'categories' | 'brands'

interface CategoryForm {
  name: string
  slug: string
  description: string
  image: string
  is_active: boolean
  sort_order: number
}

interface BrandForm {
  name: string
  logo: string
  description: string
  is_active: boolean
}

const emptyCategory: CategoryForm = {
  name: '', slug: '', description: '', image: '', is_active: true, sort_order: 0
}

const emptyBrand: BrandForm = {
  name: '', logo: '', description: '', is_active: true
}

export default function AdminCategoriesPage() {
  const [tab, setTab] = useState<Tab>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CategoryForm>(emptyCategory)
  const [catSaving, setCatSaving] = useState(false)

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [brandForm, setBrandForm] = useState<BrandForm>(emptyBrand)
  const [brandSaving, setBrandSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catRes, brandRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('brands').select('*').order('name'),
      ])
      if (catRes.error) throw catRes.error
      if (brandRes.error) throw brandRes.error
      setCategories(catRes.data || [])
      setBrands(brandRes.data || [])
    } catch (err: any) {
      toast.error('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Category CRUD
  const openCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat)
      setCatForm({
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        image: cat.image || '',
        is_active: cat.is_active,
        sort_order: cat.sort_order,
      })
    } else {
      setEditingCat(null)
      setCatForm(emptyCategory)
    }
    setCatModalOpen(true)
  }

  const saveCat = async () => {
    if (!catForm.name.trim()) {
      toast.error('Category name is required')
      return
    }
    setCatSaving(true)
    try {
      const payload = {
        name: catForm.name.trim(),
        slug: catForm.slug.trim() || generateSlug(catForm.name),
        description: catForm.description.trim() || null,
        image: catForm.image.trim() || null,
        is_active: catForm.is_active,
        sort_order: catForm.sort_order,
      }
      if (editingCat) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingCat.id)
        if (error) throw error
        toast.success('Category updated')
      } else {
        const { error } = await supabase.from('categories').insert(payload)
        if (error) throw error
        toast.success('Category created')
      }
      setCatModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category')
    } finally {
      setCatSaving(false)
    }
  }

  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category? Products in this category will be unlinked.')) return
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      toast.success('Category deleted')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const toggleCatActive = async (cat: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !cat.is_active })
        .eq('id', cat.id)
      if (error) throw error
      toast.success(cat.is_active ? 'Category hidden' : 'Category visible')
      fetchData()
    } catch (err: any) {
      toast.error('Failed to update')
    }
  }

  // Brand CRUD
  const openBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand)
      setBrandForm({
        name: brand.name,
        logo: brand.logo || '',
        description: brand.description || '',
        is_active: brand.is_active,
      })
    } else {
      setEditingBrand(null)
      setBrandForm(emptyBrand)
    }
    setBrandModalOpen(true)
  }

  const saveBrand = async () => {
    if (!brandForm.name.trim()) {
      toast.error('Brand name is required')
      return
    }
    setBrandSaving(true)
    try {
      const payload = {
        name: brandForm.name.trim(),
        logo: brandForm.logo.trim() || null,
        description: brandForm.description.trim() || null,
        is_active: brandForm.is_active,
      }
      if (editingBrand) {
        const { error } = await supabase.from('brands').update(payload).eq('id', editingBrand.id)
        if (error) throw error
        toast.success('Brand updated')
      } else {
        const { error } = await supabase.from('brands').insert(payload)
        if (error) throw error
        toast.success('Brand created')
      }
      setBrandModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save brand')
    } finally {
      setBrandSaving(false)
    }
  }

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand?')) return
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id)
      if (error) throw error
      toast.success('Brand deleted')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const toggleBrandActive = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: !brand.is_active })
        .eq('id', brand.id)
      if (error) throw error
      toast.success(brand.is_active ? 'Brand hidden' : 'Brand visible')
      fetchData()
    } catch (err: any) {
      toast.error('Failed to update')
    }
  }

  // Filtering
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">Categories & Brands</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage product categories and brands for your store.
          </p>
        </div>
        <button
          onClick={() => tab === 'categories' ? openCatModal() : openBrandModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          Add {tab === 'categories' ? 'Category' : 'Brand'}
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'categories'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={16} />
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setTab('brands')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'brands'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Tag size={16} />
            Brands ({brands.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* Categories Table */}
      {tab === 'categories' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Sort</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Layers size={32} className="mx-auto mb-2 opacity-40" />
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, idx) => (
                    <motion.tr
                      key={cat.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="px-6 py-4">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <ImageIcon size={16} className="text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{cat.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{cat.slug}</td>
                      <td className="px-6 py-4 text-slate-600">{cat.sort_order}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCatActive(cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            cat.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {cat.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          {cat.is_active ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openCatModal(cat)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => deleteCat(cat.id)}
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
      )}

      {/* Brands Table */}
      {tab === 'brands' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Logo</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Tag size={32} className="mx-auto mb-2 opacity-40" />
                      No brands found.
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((brand, idx) => (
                    <motion.tr
                      key={brand.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="px-6 py-4">
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
                            {brand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{brand.name}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                        {brand.description || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleBrandActive(brand)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            brand.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {brand.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          {brand.is_active ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openBrandModal(brand)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => deleteBrand(brand.id)}
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
      )}

      {/* Category Modal */}
      <AnimatePresence>
        {catModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setCatModalOpen(false)}
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
                  {editingCat ? 'Edit Category' : 'Add Category'}
                </h2>
                <button
                  onClick={() => setCatModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={(e) => setCatForm({
                      ...catForm,
                      name: e.target.value,
                      slug: editingCat ? catForm.slug : generateSlug(e.target.value),
                    })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="e.g. T-Shirts"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={catForm.slug}
                    onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="auto-generated"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                    placeholder="Short description..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={catForm.image}
                    onChange={(e) => setCatForm({ ...catForm, image: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="https://..."
                  />
                  {catForm.image && (
                    <img
                      src={catForm.image}
                      alt="Preview"
                      className="mt-2 w-20 h-20 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={catForm.sort_order}
                      onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <button
                      onClick={() => setCatForm({ ...catForm, is_active: !catForm.is_active })}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                        catForm.is_active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {catForm.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setCatModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCat}
                  disabled={catSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {catSaving ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Modal */}
      <AnimatePresence>
        {brandModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setBrandModalOpen(false)}
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
                  {editingBrand ? 'Edit Brand' : 'Add Brand'}
                </h2>
                <button
                  onClick={() => setBrandModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="e.g. Nike"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={brandForm.logo}
                    onChange={(e) => setBrandForm({ ...brandForm, logo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="https://..."
                  />
                  {brandForm.logo && (
                    <img
                      src={brandForm.logo}
                      alt="Preview"
                      className="mt-2 w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={brandForm.description}
                    onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                    placeholder="Brand description..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <button
                    onClick={() => setBrandForm({ ...brandForm, is_active: !brandForm.is_active })}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                      brandForm.is_active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {brandForm.is_active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setBrandModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBrand}
                  disabled={brandSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {brandSaving ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
