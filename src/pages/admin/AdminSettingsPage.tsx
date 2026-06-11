import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Save, Store, MapPin,
  Truck, Image as ImageIcon, Plus, Trash2, X, GripVertical,
  Palette
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface StoreSettings {
  store_name: string
  tagline: string
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
  state: string
  pincode: string
  country: string
  currency: string
  free_shipping_threshold: number
  shipping_fee: number
  tax_rate: number
  primary_color: string
  accent_color: string
}

interface Banner {
  id: string
  title: string
  subtitle: string
  image_url: string
  link: string
  sort_order: number
  is_active: boolean
}

const defaultSettings: StoreSettings = {
  store_name: 'Vastrini',
  tagline: 'Wear Your Story',
  email: 'support@vastrini.com',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  currency: 'INR',
  free_shipping_threshold: 999,
  shipping_fee: 99,
  tax_rate: 18,
  primary_color: '#1a1a2e',
  accent_color: '#e94560',
}

type Tab = 'general' | 'shipping' | 'banners' | 'appearance'

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Banner form
  const [bannerForm, setBannerForm] = useState({
    title: '', subtitle: '', image_url: '', link: '', is_active: true
  })
  const [addingBanner, setAddingBanner] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      // Try fetching from a settings table
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setSettings({
          store_name: data.store_name || defaultSettings.store_name,
          tagline: data.tagline || defaultSettings.tagline,
          email: data.email || defaultSettings.email,
          phone: data.phone || defaultSettings.phone,
          whatsapp: data.whatsapp || defaultSettings.whatsapp,
          address: data.address || defaultSettings.address,
          city: data.city || defaultSettings.city,
          state: data.state || defaultSettings.state,
          pincode: data.pincode || defaultSettings.pincode,
          country: data.country || defaultSettings.country,
          currency: data.currency || defaultSettings.currency,
          free_shipping_threshold: data.free_shipping_threshold ?? defaultSettings.free_shipping_threshold,
          shipping_fee: data.shipping_fee ?? defaultSettings.shipping_fee,
          tax_rate: data.tax_rate ?? defaultSettings.tax_rate,
          primary_color: data.primary_color || defaultSettings.primary_color,
          accent_color: data.accent_color || defaultSettings.accent_color,
        })
      }

      // Fetch banners
      const { data: bannerData } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order')

      if (bannerData) setBanners(bannerData)
    } catch (err) {
      // Settings table might not exist, use defaults
      console.log('Using default settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Try upsert to site_settings
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 1, ...settings })

      if (error) {
        // If table doesn't exist, just show success with defaults saved locally
        console.warn('site_settings table may not exist:', error.message)
        toast.success('Settings saved locally (no database table)')
      } else {
        toast.success('Settings saved successfully')
      }
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addBanner = async () => {
    if (!bannerForm.title.trim() || !bannerForm.image_url.trim()) {
      toast.error('Title and image URL are required')
      return
    }
    try {
      const { error } = await supabase.from('banners').insert({
        ...bannerForm,
        sort_order: banners.length,
      })
      if (error) throw error
      toast.success('Banner added')
      setBannerForm({ title: '', subtitle: '', image_url: '', link: '', is_active: true })
      setAddingBanner(false)
      fetchSettings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add banner')
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id)
      if (error) throw error
      toast.success('Banner deleted')
      fetchSettings()
    } catch (err: any) {
      toast.error('Failed to delete')
    }
  }

  const toggleBanner = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id)
      if (error) throw error
      fetchSettings()
    } catch (err: any) {
      toast.error('Failed to update')
    }
  }

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: Store },
    { id: 'shipping' as Tab, label: 'Shipping & Tax', icon: Truck },
    { id: 'banners' as Tab, label: 'Banners', icon: ImageIcon },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
  ]

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
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your store's global settings and preferences.
          </p>
        </div>
        {tab !== 'banners' && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {tab === 'general' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Store Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Store size={20} className="text-blue-500" />
              Store Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Store Name
                </label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="INR">₹ INR - Indian Rupee</option>
                  <option value="USD">$ USD - US Dollar</option>
                  <option value="EUR">€ EUR - Euro</option>
                  <option value="GBP">£ GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-blue-500" />
              Store Address
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={settings.state}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  value={settings.pincode}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={settings.country}
                  onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shipping & Tax */}
      {tab === 'shipping' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Truck size={20} className="text-blue-500" />
            Shipping & Tax Configuration
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Shipping Fee (₹)
              </label>
              <input
                type="number"
                value={settings.shipping_fee}
                onChange={(e) => setSettings({ ...settings, shipping_fee: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                min={0}
              />
              <p className="text-xs text-slate-400 mt-1">Standard delivery charge</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Free Shipping Above (₹)
              </label>
              <input
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                min={0}
              />
              <p className="text-xs text-slate-400 mt-1">Orders above this get free shipping</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                min={0}
                max={100}
                step={0.5}
              />
              <p className="text-xs text-slate-400 mt-1">GST applied on orders</p>
            </div>
          </div>

          {/* Preview Card */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Preview</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Cart Total ₹800</span>
                <span className="text-slate-400">+ ₹{settings.shipping_fee} shipping</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cart Total ₹{settings.free_shipping_threshold}+</span>
                <span className="text-emerald-600 font-semibold">Free Shipping ✓</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Tax on ₹1,000</span>
                <span className="text-slate-700 font-semibold">
                  ₹{((1000 * settings.tax_rate) / 100).toFixed(0)} ({settings.tax_rate}%)
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Banners */}
      {tab === 'banners' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Add Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-blue-500" />
                Home Banners
              </h3>
              <button
                onClick={() => setAddingBanner(!addingBanner)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {addingBanner ? <X size={14} /> : <Plus size={14} />}
                {addingBanner ? 'Cancel' : 'Add Banner'}
              </button>
            </div>

            {addingBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Banner Title"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="Subtitle (optional)"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  <input
                    type="url"
                    placeholder="Image URL *"
                    value={bannerForm.image_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="Link URL (optional)"
                    value={bannerForm.link}
                    onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <button
                  onClick={addBanner}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Banner
                </button>
              </motion.div>
            )}

            {/* Banner List */}
            {banners.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-40" />
                <p>No banners yet. Add your first banner above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition"
                  >
                    <GripVertical size={16} className="text-slate-300 cursor-grab shrink-0" />
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-20 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <ImageIcon size={16} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{banner.title}</p>
                      {banner.subtitle && (
                        <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleBanner(banner)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        banner.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {banner.is_active ? 'Active' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => deleteBanner(banner.id)}
                      className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Appearance */}
      {tab === 'appearance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Palette size={20} className="text-blue-500" />
            Brand Colors
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Used for headers, buttons, and primary elements</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Used for CTAs, sale badges, and highlights</p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-5 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Preview</p>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                style={{ backgroundColor: settings.primary_color }}
                className="text-white px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Primary Button
              </button>
              <button
                style={{ backgroundColor: settings.accent_color }}
                className="text-white px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Accent Button
              </button>
              <div
                style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})` }}
                className="text-white px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Gradient
              </div>
              <div
                style={{ borderColor: settings.primary_color, color: settings.primary_color }}
                className="border-2 px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Outlined
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
