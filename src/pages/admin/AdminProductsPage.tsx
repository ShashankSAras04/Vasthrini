import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Upload, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Product, Category, Brand } from '../../types/database'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [sku, setSku] = useState('')
  const [gender, setGender] = useState<'women' | 'unisex' | 'kids' | 'boys' | 'girls'>('unisex')
  const [color, setColor] = useState('')
  const [material, setMaterial] = useState('')
  const [featured, setFeatured] = useState(false)
  const [newArrival, setNewArrival] = useState(false)
  const [bestSeller, setBestSeller] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')

  // Variants state (sizes)
  const [sizes, setSizes] = useState<{ id?: string; size: string; stock_qty: number }[]>([])
  const [newSize, setNewSize] = useState('')
  const [newSizeQty, setNewSizeQty] = useState('0')

  // Images state
  const [images, setImages] = useState<{ id?: string; image_url: string; is_primary: boolean }[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    loadProducts()
    loadMetadata()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), brand:brands(*), variants:product_variants(*), images:product_images(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      toast.error('Failed to load products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadMetadata = async () => {
    try {
      const { data: catData } = await supabase.from('categories').select('*').eq('is_active', true).order('name')
      const { data: brandData } = await supabase.from('brands').select('*').eq('is_active', true).order('name')
      setCategories(catData || [])
      setBrands(brandData || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setSlug(product.slug)
    setDescription(product.description || '')
    setShortDescription(product.short_description || '')
    setPrice(product.price.toString())
    setDiscountPrice(product.discount_price ? product.discount_price.toString() : '')
    setStock(product.stock.toString())
    setSku(product.sku || '')
    setGender(product.gender || 'unisex')
    setColor(product.color || '')
    setMaterial(product.material || '')
    setFeatured(product.featured)
    setNewArrival(product.new_arrival)
    setBestSeller(product.best_seller)
    setIsActive(product.is_active)
    setCategoryId(product.category_id)
    setBrandId(product.brand_id || '')

    // Load sizes
    const prodSizes = product.variants?.map(v => ({
      id: v.id,
      size: v.size,
      stock_qty: v.stock_qty
    })) || []
    setSizes(prodSizes)

    // Load images
    const prodImages = product.images?.map(img => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: img.is_primary
    })) || []
    setImages(prodImages)

    setIsFormOpen(true)
  }

  const handleCreateNew = () => {
    setEditingProduct(null)
    setName('')
    setSlug('')
    setDescription('')
    setShortDescription('')
    setPrice('')
    setDiscountPrice('')
    setStock('0')
    setSku('')
    setGender('unisex')
    setColor('')
    setMaterial('')
    setFeatured(false)
    setNewArrival(true)
    setBestSeller(false)
    setIsActive(true)
    setCategoryId(categories[0]?.id || '')
    setBrandId(brands[0]?.id || '')
    setSizes([])
    setImages([])
    setIsFormOpen(true)
  }

  const handleNameChange = (val: string) => {
    setName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  const handleAddSize = () => {
    if (!newSize.trim()) return
    const qty = parseInt(newSizeQty) || 0
    if (sizes.some(s => s.size.toUpperCase() === newSize.toUpperCase())) {
      toast.error('Size already added')
      return
    }
    setSizes([...sizes, { size: newSize.toUpperCase(), stock_qty: qty }])
    setNewSize('')
    setNewSizeQty('0')
  }

  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index))
  }

  const handleAddImageText = () => {
    if (!newImageUrl.trim()) return
    const primary = images.length === 0
    setImages([...images, { image_url: newImageUrl, is_primary: primary }])
    setNewImageUrl('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)

      const primary = images.length === 0
      setImages([...images, { image_url: publicUrl, is_primary: primary }])
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error('Failed to upload image')
      console.error(err)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSetPrimaryImage = (index: number) => {
    setImages(images.map((img, i) => ({
      ...img,
      is_primary: i === index
    })))
  }

  const handleRemoveImage = (index: number) => {
    const wasPrimary = images[index].is_primary
    const nextImages = images.filter((_, i) => i !== index)
    if (wasPrimary && nextImages.length > 0) {
      nextImages[0].is_primary = true
    }
    setImages(nextImages)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || !categoryId) {
      toast.error('Please fill required fields')
      return
    }

    const totalStock = sizes.reduce((sum, s) => sum + s.stock_qty, 0)

    const productData = {
      name,
      slug,
      description: description || null,
      short_description: shortDescription || null,
      price: parseFloat(price),
      discount_price: discountPrice ? parseFloat(discountPrice) : null,
      stock: totalStock || parseInt(stock) || 0,
      sku: sku || null,
      gender,
      color: color || null,
      material: material || null,
      featured,
      new_arrival: newArrival,
      best_seller: bestSeller,
      is_active: isActive,
      category_id: categoryId,
      brand_id: brandId || null,
    }

    try {
      let productId = editingProduct?.id

      if (editingProduct) {
        // Update product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Product updated successfully')
      } else {
        // Insert product
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()

        if (error) throw error
        productId = data.id
        toast.success('Product created successfully')
      }

      if (productId) {
        // 1. Sync variants (sizes)
        // Delete old variants
        if (editingProduct) {
          await supabase.from('product_sizes').delete().eq('product_id', productId)
        }
        // Insert new variants
        if (sizes.length > 0) {
          const variantsToInsert = sizes.map(s => ({
            product_id: productId,
            size: s.size,
            quantity: s.stock_qty
          }))
          const { error: vError } = await supabase.from('product_sizes').insert(variantsToInsert)
          if (vError) throw vError
        }

        // 2. Sync images
        // Delete old images
        if (editingProduct) {
          await supabase.from('product_images').delete().eq('product_id', productId)
        }
        // Insert new images
        if (images.length > 0) {
          const imagesToInsert = images.map((img, idx) => ({
            product_id: productId,
            image_url: img.image_url,
            is_primary: img.is_primary,
            display_order: idx
          }))
          const { error: imgError } = await supabase.from('product_images').insert(imagesToInsert)
          if (imgError) throw imgError
        }
      }

      setIsFormOpen(false)
      loadProducts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product')
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This will remove all inventory and orders references.')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      toast.success('Product deleted')
      loadProducts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product')
    }
  }

  const toggleActiveStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      toast.success(`Product marked as ${!product.is_active ? 'active' : 'inactive'}`)
      loadProducts()
    } catch (err: any) {
      toast.error('Failed to toggle active status')
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = selectedCategory ? p.category_id === selectedCategory : true
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage catalog items, stock details, and image galleries.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-3 rounded-xl font-semibold transition shadow"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* Filters & search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-slate-300 transition"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="text-slate-500 mt-2">Loading catalog items...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Category / Brand</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No products found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const primaryImg = p.images?.find(img => img.is_primary) ?? p.images?.[0]
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                              {primaryImg ? (
                                <img src={primaryImg.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  N/A
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-950 line-clamp-1">{p.name}</h4>
                              <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">{p.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500 font-semibold">{p.sku || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <p className="font-semibold">{p.category?.name}</p>
                          <p className="text-xs text-slate-400">{p.brand?.name || 'No Brand'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-950">₹{p.price.toLocaleString('en-IN')}</p>
                          {p.discount_price && (
                            <p className="text-xs text-slate-400 line-through">₹{p.discount_price.toLocaleString('en-IN')}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${p.stock <= 5 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActiveStatus(p)}
                            title="Toggle status"
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.is_active ? 'Active' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Slider Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/40" />

          {/* Form container */}
          <div className="relative w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl z-10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold font-outfit text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount Price (INR)</label>
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="">No Brand</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                    <option value="kids">Kids</option>
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Color</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Red, Blue"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Material</label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. Cotton, Denim"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Short Description</label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Status checkboxes */}
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  Featured Product
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArrival}
                    onChange={(e) => setNewArrival(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  New Arrival
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bestSeller}
                    onChange={(e) => setBestSeller(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  Best Seller
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-slate-900 rounded"
                  />
                  Published (Active)
                </label>
              </div>

              {/* Sizes / Stock Inventory */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-slate-900 font-outfit">Size & Stock Variants</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Size (e.g. S, M, XL, 32)"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newSizeQty}
                    onChange={(e) => setNewSizeQty(e.target.value)}
                    className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                  >
                    Add Size
                  </button>
                </div>

                {sizes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No custom sizes added. Total stock fallback: {stock} units</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
                        {s.size} : {s.stock_qty} units
                        <button type="button" onClick={() => handleRemoveSize(idx)} className="text-rose-500 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Images manager */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-slate-900 font-outfit">Product Images</h3>

                {/* Upload File or URL text */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add Image URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageText}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                      Add URL
                    </button>
                  </div>

                  <div className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-slate-400 transition cursor-pointer">
                    <label className="flex flex-col items-center gap-2 cursor-pointer w-full text-center">
                      <Upload size={24} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500">
                        {uploadingImage ? 'Uploading image...' : 'Click to upload files to Supabase products storage'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {images.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No images added. First image will be the primary thumbnail.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className={`relative border rounded-xl overflow-hidden aspect-[3/4] group ${img.is_primary ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-200'}`}>
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition duration-200">
                          {!img.is_primary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold px-2 py-1 rounded"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                        {img.is_primary && (
                          <span className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
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
                className="w-1/2 bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow"
              >
                <Save size={18} />
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
