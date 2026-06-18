import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Save, Store, Truck, Image as ImageIcon, Plus, Trash2, X,
  Palette, Upload, Megaphone, Globe
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface StoreSettings {
  store_name: string
  logo_url: string | null
  favicon_url: string | null
  support_email: string
  free_shipping_threshold: number
  shipping_charge: number
  announcement_enabled: boolean
  announcement_text: string
  announcement_speed: number
  announcement_bg: string
  announcement_fg: string
  offer_section_enabled: boolean
  offer_title: string | null
  offer_subtitle: string | null
  offer_cta_text: string | null
  offer_cta_link: string | null
  instagram_url: string | null
  whatsapp_number: string | null
  whatsapp_message: string | null
  facebook_url: string | null
  social_enabled: boolean
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
  store_name: 'Vasthrini',
  logo_url: null,
  favicon_url: null,
  support_email: 'support@vasthrini.com',
  free_shipping_threshold: 999,
  shipping_charge: 99,
  announcement_enabled: true,
  announcement_text: '🎉 Free shipping on orders above ₹999 | Use code VASTRINI10 for 10% off',
  announcement_speed: 20,
  announcement_bg: '#1a1a2e',
  announcement_fg: '#ffffff',
  offer_section_enabled: true,
  offer_title: 'Special Collection Offer',
  offer_subtitle: 'Get up to 50% off on newly arrived summer dresses',
  offer_cta_text: 'Shop Sale',
  offer_cta_link: '/shop?filter=sale',
  instagram_url: 'https://instagram.com/vasthrini',
  whatsapp_number: '919876543210',
  whatsapp_message: 'Hi, I have a question about my order',
  facebook_url: 'https://facebook.com/vasthrini',
  social_enabled: true,
}

type Tab = 'brand' | 'shipping' | 'announcement' | 'promo' | 'social' | 'banners'

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('brand')
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

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
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (!error && data) {
        setSettings({
          store_name: data.store_name ?? defaultSettings.store_name,
          logo_url: data.logo_url ?? defaultSettings.logo_url,
          favicon_url: data.favicon_url ?? defaultSettings.favicon_url,
          support_email: data.support_email ?? defaultSettings.support_email,
          free_shipping_threshold: Number(data.free_shipping_threshold ?? defaultSettings.free_shipping_threshold),
          shipping_charge: Number(data.shipping_charge ?? defaultSettings.shipping_charge),
          announcement_enabled: data.announcement_enabled ?? defaultSettings.announcement_enabled,
          announcement_text: data.announcement_text ?? defaultSettings.announcement_text,
          announcement_speed: Number(data.announcement_speed ?? defaultSettings.announcement_speed),
          announcement_bg: data.announcement_bg ?? defaultSettings.announcement_bg,
          announcement_fg: data.announcement_fg ?? defaultSettings.announcement_fg,
          offer_section_enabled: data.offer_section_enabled ?? defaultSettings.offer_section_enabled,
          offer_title: data.offer_title ?? defaultSettings.offer_title,
          offer_subtitle: data.offer_subtitle ?? defaultSettings.offer_subtitle,
          offer_cta_text: data.offer_cta_text ?? defaultSettings.offer_cta_text,
          offer_cta_link: data.offer_cta_link ?? defaultSettings.offer_cta_link,
          instagram_url: data.instagram_url ?? defaultSettings.instagram_url,
          whatsapp_number: data.whatsapp_number ?? defaultSettings.whatsapp_number,
          whatsapp_message: data.whatsapp_message ?? defaultSettings.whatsapp_message,
          facebook_url: data.facebook_url ?? defaultSettings.facebook_url,
          social_enabled: data.social_enabled ?? defaultSettings.social_enabled,
        })
      }

      // Fetch banners
      const { data: bannerData } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order')

      if (bannerData) setBanners(bannerData)
    } catch (err) {
      console.error('Error fetching settings:', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })

      if (error) throw error
      toast.success('Settings saved successfully')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (type === 'logo') setUploadingLogo(true)
    else if (type === 'favicon') setUploadingFavicon(true)
    else if (type === 'banner') setUploadingBanner(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}-${crypto.randomUUID()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('site')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('site').getPublicUrl(filePath)
      
      if (type === 'logo') {
        setSettings(prev => ({ ...prev, logo_url: data.publicUrl }))
        toast.success('Logo uploaded successfully!')
      } else if (type === 'favicon') {
        setSettings(prev => ({ ...prev, favicon_url: data.publicUrl }))
        toast.success('Favicon uploaded successfully!')
      } else if (type === 'banner') {
        setBannerForm(prev => ({ ...prev, image_url: data.publicUrl }))
        toast.success('Banner image uploaded successfully!')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingLogo(false)
      setUploadingFavicon(false)
      setUploadingBanner(false)
    }
  }

  const addBanner = async () => {
    if (!bannerForm.title.trim() || !bannerForm.image_url.trim()) {
      toast.error('Title and image are required')
      return
    }
    try {
      const { error } = await supabase.from('banners').insert({
        title: bannerForm.title,
        subtitle: bannerForm.subtitle,
        image_url: bannerForm.image_url,
        link_url: bannerForm.link, // DB table has link_url (upgraded in 007)
        sort_order: banners.length,
        is_active: bannerForm.is_active
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
      toast.error('Failed to delete banner')
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
      toast.error('Failed to update banner')
    }
  }

  const tabs = [
    { id: 'brand' as Tab, label: 'Brand & Identity', icon: Store },
    { id: 'shipping' as Tab, label: 'Shipping & Rules', icon: Truck },
    { id: 'announcement' as Tab, label: 'Announcement Bar', icon: Megaphone },
    { id: 'promo' as Tab, label: 'Offer Strip', icon: Palette },
    { id: 'social' as Tab, label: 'Social & Footer', icon: Globe },
    { id: 'banners' as Tab, label: 'Home Banners', icon: ImageIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-outfit">Site Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your brand identity, shipping policies, banners, announcement marquee, and social links.
          </p>
        </div>
        {tab !== 'banners' && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto gap-1 border border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Brand Identity */}
      {tab === 'brand' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store size={20} className="text-[#e94560]" />
              Brand Details
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Store Name
                </label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                  placeholder="e.g. Vasthrini"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Support Email Address
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                  placeholder="e.g. support@vasthrini.com"
                />
              </div>
            </div>

            {/* Logo and Favicon upload rows */}
            <div className="grid sm:grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Store Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-xs text-slate-400">No Logo</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition">
                      <Upload size={14} />
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-2">Recommended size: 240x80px (PNG/WebP with transparent bg)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Browser Favicon
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {settings.favicon_url ? (
                      <img src={settings.favicon_url} alt="Favicon" className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">No Favicon</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition">
                      <Upload size={14} />
                      {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'favicon')}
                        disabled={uploadingFavicon}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-2">Recommended: 32x32px square PNG/ICO</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shipping and Rules */}
      {tab === 'shipping' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Truck size={20} className="text-[#e94560]" />
              Shipping Config
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Shipping Charge (₹)
                </label>
                <input
                  type="number"
                  value={settings.shipping_charge}
                  onChange={(e) => setSettings({ ...settings, shipping_charge: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                  min="0"
                />
                <p className="text-[11px] text-slate-400">Fee charged on order shipments below threshold.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  value={settings.free_shipping_threshold}
                  onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                  min="0"
                />
                <p className="text-[11px] text-slate-400">Order total amount needed to qualify for free shipping.</p>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-100 flex items-start gap-2.5">
              <span className="text-lg">💡</span>
              <div>
                <p className="font-semibold text-slate-800">Dynamic Rules Active</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Cart totals under <strong className="text-slate-700">₹{settings.free_shipping_threshold}</strong> will have a <strong className="text-slate-700">₹{settings.shipping_charge}</strong> delivery fee applied automatically. Server computes this during checkout to prevent client-side hacks.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Announcement Bar */}
      {tab === 'announcement' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={20} className="text-[#e94560]" />
                Announcement Bar Configuration
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcement_enabled}
                  onChange={(e) => setSettings({ ...settings, announcement_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]"></div>
                <span className="ml-2 text-xs font-semibold text-slate-600 uppercase">Enable</span>
              </label>
            </div>

            {settings.announcement_enabled && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Announcement Marquee Text
                  </label>
                  <input
                    type="text"
                    value={settings.announcement_text}
                    onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                    placeholder="Enter announcement..."
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Marquee Speed (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.announcement_speed}
                      onChange={(e) => setSettings({ ...settings, announcement_speed: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      min="5"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Lower is faster (time to scroll across screen).</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Background Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.announcement_bg}
                        onChange={(e) => setSettings({ ...settings, announcement_bg: e.target.value })}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.announcement_bg}
                        onChange={(e) => setSettings({ ...settings, announcement_bg: e.target.value })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#e94560]/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.announcement_fg}
                        onChange={(e) => setSettings({ ...settings, announcement_fg: e.target.value })}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.announcement_fg}
                        onChange={(e) => setSettings({ ...settings, announcement_fg: e.target.value })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#e94560]/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Announcement Bar Live Preview */}
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Preview</p>
                  <div
                    style={{ backgroundColor: settings.announcement_bg, color: settings.announcement_fg }}
                    className="p-3.5 text-center text-xs font-bold rounded-lg overflow-hidden whitespace-nowrap relative border border-black/10"
                  >
                    <span className="inline-block animate-pulse">{settings.announcement_text}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Offer / Promotion Strip */}
      {tab === 'promo' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Palette size={20} className="text-[#e94560]" />
                Homepage Promotion Banner Strip
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.offer_section_enabled}
                  onChange={(e) => setSettings({ ...settings, offer_section_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]"></div>
                <span className="ml-2 text-xs font-semibold text-slate-600 uppercase">Enable</span>
              </label>
            </div>

            {settings.offer_section_enabled && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Promo Title
                    </label>
                    <input
                      type="text"
                      value={settings.offer_title || ''}
                      onChange={(e) => setSettings({ ...settings, offer_title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="e.g. Special Collection Offer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Promo Subtitle / Description
                    </label>
                    <input
                      type="text"
                      value={settings.offer_subtitle || ''}
                      onChange={(e) => setSettings({ ...settings, offer_subtitle: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="e.g. Get up to 50% off on newly arrived items"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={settings.offer_cta_text || ''}
                      onChange={(e) => setSettings({ ...settings, offer_cta_text: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="e.g. Shop Sale"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      CTA Link URL / Path
                    </label>
                    <input
                      type="text"
                      value={settings.offer_cta_link || ''}
                      onChange={(e) => setSettings({ ...settings, offer_cta_link: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="e.g. /shop?filter=sale"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Social Links & Footer */}
      {tab === 'social' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Globe size={20} className="text-[#e94560]" />
                Footer & Social Settings
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.social_enabled}
                  onChange={(e) => setSettings({ ...settings, social_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]"></div>
                <span className="ml-2 text-xs font-semibold text-slate-600 uppercase">Enable</span>
              </label>
            </div>

            {settings.social_enabled && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={settings.instagram_url || ''}
                      onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={settings.facebook_url || ''}
                      onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      value={settings.whatsapp_number || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="e.g. 919876543210 (include country code, digits only)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      WhatsApp Pre-filled Message
                    </label>
                    <input
                      type="text"
                      value={settings.whatsapp_message || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#e94560]/20 focus:border-[#e94560] outline-none transition"
                      placeholder="Hi, I am interested in your fashion collections"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Hero Banners */}
      {tab === 'banners' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-[#e94560]" />
                Home hero Carousel Banners
              </h3>
              <button
                onClick={() => setAddingBanner(!addingBanner)}
                className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {addingBanner ? <X size={14} /> : <Plus size={14} />}
                {addingBanner ? 'Cancel' : 'Add Banner'}
              </button>
            </div>

            {addingBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-slate-200 rounded-xl p-4 mb-6 space-y-4 bg-slate-50"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Banner Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Collection"
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 20% off"
                      value={bannerForm.subtitle}
                      onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Destination URL Path</label>
                    <input
                      type="text"
                      placeholder="e.g. /shop?filter=new"
                      value={bannerForm.link}
                      onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Banner Image *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Image URL or upload a file"
                        value={bannerForm.image_url}
                        onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                      />
                      <label className="inline-flex items-center gap-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer shrink-0 transition">
                        <Upload size={14} />
                        {uploadingBanner ? '...' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'banner')}
                          disabled={uploadingBanner}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={addBanner}
                  className="bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
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
                    className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-150 hover:border-slate-200 transition bg-white"
                  >
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-24 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
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
    </div>
  )
}
