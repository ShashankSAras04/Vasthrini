import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, MapPin, Camera, Plus, Trash2, Check, Star, Lock } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase } from '../../lib/supabase'
import type { Address } from '../../types/database'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile, fetchProfile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Profile Form States
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  // Change Password States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  // Address Form States
  const [label, setLabel] = useState('Home')
  const [fullName, setFullName] = useState('')
  const [addressPhone, setAddressPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name)
      setLastName(profile.last_name)
      setPhone(profile.phone || '')
    }
  }, [profile])

  useEffect(() => {
    if (user) {
      loadAddresses()
    }
  }, [user])

  const loadAddresses = async () => {
    if (!user) return
    setAddressLoading(true)
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load addresses')
    } finally {
      setAddressLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        })
        .eq('id', user.id)

      if (error) throw error
      await fetchProfile(user.id)
      toast.success('Profile updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profile_image: publicUrl })
        .eq('id', user.id)

      if (profileError) throw profileError

      await fetchProfile(user.id)
      toast.success('Avatar updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const addressData = {
        user_id: user.id,
        label,
        full_name: fullName,
        phone: addressPhone,
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        city,
        state,
        country: 'India',
        postal_code: postalCode,
      }

      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', editingAddress.id)

        if (error) throw error
        toast.success('Address updated successfully')
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert(addressData)

        if (error) throw error
        toast.success('Address added successfully')
      }

      // Reset form
      setShowAddressForm(false)
      setEditingAddress(null)
      resetAddressForm()
      loadAddresses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const handleEditAddress = (addr: Address) => {
    setEditingAddress(addr)
    setLabel(addr.label)
    setFullName(addr.full_name)
    setAddressPhone(addr.phone)
    setAddressLine1(addr.address_line1)
    setAddressLine2(addr.address_line2 || '')
    setCity(addr.city)
    setState(addr.state)
    setPostalCode(addr.postal_code)
    setShowAddressForm(true)
  }

  const handleDeleteAddress = async (addrId: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addrId)

      if (error) throw error
      toast.success('Address deleted')
      loadAddresses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete address')
    }
  }

  const handleSetDefaultAddress = async (addrId: string) => {
    try {
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addrId)

      if (error) throw error
      toast.success('Default address updated')
      loadAddresses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update default address')
    }
  }

  const resetAddressForm = () => {
    setLabel('Home')
    setFullName('')
    setAddressPhone('')
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setState('')
    setPostalCode('')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-outfit text-[#1a1a2e] mb-8">My Account</h1>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 mb-8 gap-4">
          <button
            onClick={() => { setActiveTab('profile'); setShowAddressForm(false); }}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-[#1a1a2e] text-[#1a1a2e]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <User size={16} />
            Profile Details
          </button>
          <button
            onClick={() => { setActiveTab('addresses'); }}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'addresses'
                ? 'border-[#1a1a2e] text-[#1a1a2e]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <MapPin size={16} />
            Shipping Addresses
          </button>
        </div>

        {activeTab === 'profile' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Avatar block */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {profile?.profile_image ? (
                    <img src={profile.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-[#1a1a2e] hover:bg-[#e94560] text-white p-2.5 rounded-full cursor-pointer shadow-lg transition duration-200">
                  <Camera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{profile?.email}</p>
              <span className="mt-3 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wider">
                {profile?.role}
              </span>
            </div>

            {/* Profile detail form & Change Password */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-6">Personal Details</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ''}
                      className="w-full border border-gray-200 bg-gray-50 text-gray-400 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold py-3.5 rounded-xl transition duration-300 flex items-center justify-center gap-2"
                  >
                    {loading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                    Save Changes
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-[#e94560]" />
                  Change Password
                </h2>
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a2e]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold py-3.5 rounded-xl transition duration-300 flex items-center justify-center gap-2"
                  >
                    {passwordLoading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header / Add button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
              {!showAddressForm && (
                <button
                  onClick={() => { setEditingAddress(null); resetAddressForm(); setShowAddressForm(true); }}
                  className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#e94560] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  <Plus size={16} />
                  Add Address
                </button>
              )}
            </div>

            {showAddressForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="font-bold text-lg text-gray-900 mb-4">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h3>
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Label (e.g. Home, Work)</label>
                      <input
                        type="text"
                        required
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={addressPhone}
                        onChange={(e) => setAddressPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Pincode</label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
                    >
                      {loading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                      {editingAddress ? 'Update' : 'Save'} Address
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {addressLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a1a2e]"></div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-gray-500">No addresses saved yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-white rounded-2xl p-5 shadow-sm border transition flex flex-col justify-between ${
                      addr.is_default ? 'border-[#1a1a2e] ring-1 ring-[#1a1a2e]' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold uppercase rounded-md tracking-wider">
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                            <Star size={10} className="fill-amber-600" />
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900">{addr.full_name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{addr.address_line1}</p>
                      {addr.address_line2 && <p className="text-sm text-gray-500">{addr.address_line2}</p>}
                      <p className="text-sm text-gray-500">{addr.city}, {addr.state} - {(addr as any).postal_code}</p>
                      <p className="text-sm text-gray-500 mt-2 font-medium">Phone: {addr.phone}</p>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#1a1a2e] transition"
                        >
                          <Check size={14} />
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAddress(addr)}
                        className="text-xs font-semibold text-gray-500 hover:text-[#1a1a2e] transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
