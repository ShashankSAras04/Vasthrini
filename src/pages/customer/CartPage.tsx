import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { supabase } from '../../lib/supabase';
import type { Coupon } from '../../types/database';
import toast from 'react-hot-toast';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, appliedCoupon, setAppliedCoupon } = useCartStore();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    document.title = 'Shopping Cart - VASTRINI';
  }, []);

  const getItemPrice = (item: (typeof items)[number]) => {
    const base =
      item.variant?.product?.discount_price ?? item.variant?.product?.price ?? 0;
    return base + (item.variant?.extra_price ?? 0);
  };

  const subtotal = items.reduce(
    (acc, item) => acc + getItemPrice(item) * item.quantity,
    0
  );

  const freeShippingThreshold = settings?.free_shipping_threshold ?? 999;
  const shippingCharge = settings?.shipping_charge ?? 99;
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCharge;

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.round((subtotal * appliedCoupon.discount_value) / 100)
      : appliedCoupon.discount_value
    : 0;

  const total = subtotal - discount + shipping;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponError('Invalid or expired coupon code.');
        setCouponLoading(false);
        return;
      }

      const coupon = data as Coupon;

      if (coupon.min_order_amount !== null && subtotal < coupon.min_order_amount) {
        setCouponError(
          `Minimum order of ₹${coupon.min_order_amount} required for this coupon.`
        );
        setCouponLoading(false);
        return;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setCouponError('This coupon has expired.');
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success('Coupon applied successfully!');
    } catch {
      setCouponError('Something went wrong. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 text-sm">
              Looks like you haven't added anything yet.
            </p>
          </div>
          <Link
            to="/shop"
            className="bg-[#e94560] text-white px-8 py-3 rounded-2xl font-semibold text-base hover:bg-[#c73652] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LEFT: Cart Items */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const price = getItemPrice(item);
                const imageUrl =
                  item.variant?.product?.images?.[0]?.image_url ?? '';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                    className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 items-start"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      {imageUrl ? (
                          <img
                          src={imageUrl}
                          alt={item.variant?.product?.name ?? ''}
                          className="w-20 h-20 object-cover rounded-xl"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=60';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {item.variant?.product?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[
                          item.variant?.size && `Size: ${item.variant.size}`,
                          item.variant?.color && `Color: ${item.variant.color}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        ₹{price.toLocaleString('en-IN')}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(user?.id ?? '', item.id, item.quantity - 1)
                              : removeFromCart(user?.id ?? '', item.id)
                          }
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(user?.id ?? '', item.id, item.quantity + 1)
                          }
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Line Total + Remove */}
                    <div className="flex flex-col items-end justify-between h-full gap-4">
                      <p className="font-bold text-gray-900 text-sm whitespace-nowrap">
                        ₹{(price * item.quantity).toLocaleString('en-IN')}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(user?.id ?? '', item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

              {/* Subtotal */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span className="font-medium text-gray-900">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Coupon Input */}
              <div className="border border-dashed border-gray-200 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Coupon Code
                  </span>
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">
                      {appliedCoupon.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs text-red-400 hover:text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError('');
                        }}
                        placeholder="Enter code"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]/30 focus:border-[#e94560]"
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-500">{couponError}</p>
                    )}
                  </>
                )}
              </div>

              {/* Discount Row */}
              {appliedCoupon && discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-semibold">
                    − ₹{discount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className="font-medium text-gray-900">
                  {shipping === 0 ? (
                    <span className="text-green-600 font-semibold">Free</span>
                  ) : (
                    `₹${shipping}`
                  )}
                </span>
              </div>

              {shipping > 0 && (
                <p className="text-xs text-gray-400 -mt-2">
                  Add ₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')} more for free shipping
                </p>
              )}

              <hr className="border-gray-100" />

              {/* Total */}
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>

              {/* Proceed to Checkout */}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="bg-[#e94560] text-white w-full py-4 rounded-2xl font-bold text-lg hover:bg-[#c73652] transition-colors mt-1"
              >
                Proceed to Checkout
              </button>

              {/* Continue Shopping */}
              <Link
                to="/shop"
                className="text-center text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                Continue Shopping
              </Link>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 pt-2 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Shield className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    Secure Checkout
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    Free Returns
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
