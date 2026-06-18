import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MapPin, CreditCard, ChevronRight, Plus, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { useCartStore } from '../../store/useCartStore'
import type { Address } from '../../types/database'

const addressSchema = z.object({
  label: z.string().min(1),
  full_name: z.string().min(2),
  phone: z.string().min(10),
  address_line1: z.string().min(5),
  address_line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(1),
  postal_code: z.string().min(6).max(6),
})
type AddressForm = z.infer<typeof addressSchema>

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'upi', label: 'UPI Payment', icon: '📱' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, getTotalPrice, clearCart } = useCartStore()

  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('cod')
  const [placing, setPlacing] = useState(false)

  const { data: addresses, refetch: refetchAddresses } = useQuery<Address[]>({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
      if (error) throw error
      return data as Address[]
    },
    enabled: !!user,
  })

  // Watch addresses and set default selected address
  useEffect(() => {
    if (addresses?.length && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) || addresses[0]
      setSelectedAddressId(def.id)
    }
  }, [addresses, selectedAddressId])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'India', label: 'Home' },
  })

  const addAddressMutation = useMutation({
    mutationFn: async (values: AddressForm) => {
      const { data, error } = await supabase
        .from('addresses')
        .insert({ ...values, user_id: user!.id, is_default: !addresses?.length })
        .select()
        .single()
      if (error) throw error
      return data as Address
    },
    onSuccess: (data) => {
      toast.success('Address saved!')
      setSelectedAddressId(data.id)
      setShowNewAddress(false)
      reset()
      refetchAddresses()
    },
    onError: () => toast.error('Failed to save address'),
  })

  const subtotal = getTotalPrice()
  const shipping = subtotal >= 999 ? 0 : 99
  const total = subtotal + shipping

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) { toast.error('Please select a delivery address'); return }
    if (!user) return
    setPlacing(true)

    try {
      // Create order
      const orderNumber = `VST${Date.now()}`
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          payment_method: paymentMethod,
          subtotal,
          discount_amount: 0,
          shipping_charge: shipping,
          tax_amount: 0,
          total_amount: total,
          address_id: selectedAddressId,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map((item) => {
        const variant = item.variant as any
        const product = variant?.product
        const price = (product?.discount_price ?? product?.price ?? 0) + (variant?.extra_price ?? 0)
        return {
          order_id: order.id,
          variant_id: item.variant_id,
          product_id: product?.id,
          product_name: product?.name || 'Product',
          variant_label: `${variant?.size} / ${variant?.color}`,
          unit_price: price,
          quantity: item.quantity,
          subtotal: price * item.quantity,
        }
      })

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Clear cart
      await clearCart(user.id)

      toast.success('Order placed successfully! 🎉')
      navigate(`/orders/${order.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]'
  const errorCls = 'text-xs text-red-500 mt-1'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1
        className="text-3xl font-bold text-gray-900 mb-8"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        Checkout
      </h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['address', 'payment'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s
                  ? 'bg-[#1a1a2e] text-white'
                  : step === 'payment' && s === 'address'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step === 'payment' && s === 'address' ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium capitalize ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
              {s === 'address' ? 'Delivery Address' : 'Payment'}
            </span>
            {i < 1 && <ChevronRight size={16} className="text-gray-400 ml-1" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {step === 'address' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-[#e94560]" /> Delivery Address
              </h2>

              {/* Saved addresses */}
              {addresses && addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? 'border-[#1a1a2e] bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-[#1a1a2e]"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{addr.full_name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {addr.address_line1}
                          {addr.address_line2 ? `, ${addr.address_line2}` : ''},
                           {addr.city}, {addr.state} — {(addr as any).postal_code}
                        </p>
                        <p className="text-sm text-gray-500">📞 {addr.phone}</p>
                        {addr.is_default && (
                          <span className="inline-block mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Add new address */}
              <button
                onClick={() => setShowNewAddress(!showNewAddress)}
                className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e] border-2 border-dashed border-gray-300 rounded-2xl px-4 py-3 w-full justify-center hover:border-[#1a1a2e] transition-colors mb-4"
              >
                <Plus size={16} />
                {showNewAddress ? 'Cancel' : 'Add New Address'}
              </button>

              {showNewAddress && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleSubmit((v) => addAddressMutation.mutate(v))}
                  className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-5"
                >
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Label</label>
                    <input {...register('label')} placeholder="Home / Office" className={inputCls} />
                    {errors.label && <p className={errorCls}>{errors.label.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                    <input {...register('full_name')} placeholder="John Doe" className={inputCls} />
                    {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                    <input {...register('phone')} placeholder="9999999999" className={inputCls} />
                    {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Address Line 1</label>
                    <input {...register('address_line1')} placeholder="House/Flat No, Street" className={inputCls} />
                    {errors.address_line1 && <p className={errorCls}>{errors.address_line1.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Address Line 2 (optional)</label>
                    <input {...register('address_line2')} placeholder="Landmark, Area" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">City</label>
                    <input {...register('city')} placeholder="Mumbai" className={inputCls} />
                    {errors.city && <p className={errorCls}>{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">State</label>
                    <input {...register('state')} placeholder="Maharashtra" className={inputCls} />
                    {errors.state && <p className={errorCls}>{errors.state.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Pincode</label>
                     <input {...register('postal_code')} placeholder="400001" className={inputCls} maxLength={6} />
                     {errors.postal_code && <p className={errorCls}>{errors.postal_code.message}</p>}
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={addAddressMutation.isPending}
                      className="w-full py-2.5 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#e94560] transition-colors disabled:opacity-50"
                    >
                      {addAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </motion.form>
              )}

              <button
                onClick={() => {
                  if (!selectedAddressId) { toast.error('Please select an address'); return }
                  setStep('payment')
                }}
                className="mt-4 w-full py-4 bg-[#1a1a2e] text-white font-bold rounded-2xl hover:bg-[#e94560] transition-colors"
              >
                Continue to Payment
              </button>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setStep('address')}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 ml-2">
                  <CreditCard size={18} className="text-[#e94560]" /> Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                      paymentMethod === pm.id
                        ? 'border-[#1a1a2e] bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="accent-[#1a1a2e]"
                    />
                    <span className="text-xl">{pm.icon}</span>
                    <span className="font-medium text-gray-900">{pm.label}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div>
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const variant = item.variant as any
                const product = variant?.product
                const price = (product?.discount_price ?? product?.price ?? 0) + (variant?.extra_price ?? 0)
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                      {product?.images?.[0] && (
                        <img src={product.images[0].image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{product?.name}</p>
                      <p className="text-xs text-gray-500">
                        {variant?.size} / {variant?.color} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{(price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {step === 'payment' && (
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="mt-6 w-full py-4 bg-[#e94560] text-white font-bold rounded-2xl hover:bg-[#c73652] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Place Order'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
