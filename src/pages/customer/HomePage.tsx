import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Headphones, Shield, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import { supabase } from '../../lib/supabase';
import type { Product, Category } from '../../types/database';

// Reused global types from '../../types/database'

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as any } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const floatAnimation = (delay = 0) => ({
  animate: {
    y: [0, -22, 0],
    transition: {
      duration: 5 + delay,
      repeat: Infinity,
      ease: 'easeInOut' as any,
      delay,
    },
  },
});

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------
const CategorySkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-2">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="skeleton min-w-[200px] h-48 rounded-2xl flex-shrink-0 bg-gray-200 animate-pulse"
      />
    ))}
  </div>
);

const ProductSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="skeleton h-72 rounded-2xl bg-gray-200 animate-pulse" />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Trust Badge Data
// ---------------------------------------------------------------------------
const trustBadges = [
  {
    icon: Truck,
    title: 'Free Shipping',
    desc: 'On all orders above ₹999',
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    desc: '100% encrypted transactions',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    desc: "We're always here for you",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomePage() {
  const navigate = useNavigate();

  // ── Categories Query ──────────────────────────────────────────────────────
  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Featured Products Query ───────────────────────────────────────────────
  const {
    data: featuredProducts,
    isLoading: productsLoading,
  } = useQuery<Product[]>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*), category:categories(*), brand:brands(*)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <div className="min-h-screen bg-white">

        {/* ================================================================ */}
        {/* 1. HERO SECTION                                                   */}
        {/* ================================================================ */}
        <section
          className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          {/* Floating background shapes */}
          <motion.div
            className="absolute top-16 left-12 w-72 h-72 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #e94560, transparent)' }}
            {...floatAnimation(0)}
          />
          <motion.div
            className="absolute bottom-24 right-16 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #e94560, transparent)' }}
            {...floatAnimation(1.5)}
          />
          <motion.div
            className="absolute top-1/2 left-1/4 w-40 h-40 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }}
            {...floatAnimation(0.8)}
          />
          <motion.div
            className="absolute top-1/4 right-1/3 w-24 h-24 rounded-full border border-white/10"
            {...floatAnimation(2)}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/3 w-16 h-16 rounded-full border border-[#e94560]/20"
            {...floatAnimation(1)}
          />

          {/* Hero content */}
          <motion.div
            className="relative z-10 text-center px-4 flex flex-col items-center gap-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Brand label */}
            <motion.span
              variants={fadeInUp}
              className="text-[#e94560] tracking-[0.4em] uppercase text-sm font-semibold"
            >
              New Collection 2026
            </motion.span>

            {/* Main heading */}
            <motion.h1
              variants={fadeInUp}
              className="font-black text-7xl md:text-9xl leading-none tracking-tight"
              style={{
                fontFamily: "'Outfit', sans-serif",
                background: 'linear-gradient(135deg, #ffffff 0%, #e94560 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              VASTRINI
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeInUp}
              className="text-gray-300 text-lg md:text-2xl font-light tracking-widest max-w-xl"
            >
              Premium Fashion.&nbsp;&nbsp;Unmatched Style.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 mt-4"
            >
              <button
                onClick={() => navigate('/shop')}
                className="bg-[#e94560] text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[#e94560]/30 active:scale-95"
              >
                Shop Now
              </button>
              <button
                onClick={() => navigate('/shop')}
                className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-[#1a1a2e] transition-all duration-300 active:scale-95"
              >
                Explore Collections
              </button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 6, 0] }}
            transition={{ delay: 1.2, duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            onClick={() => window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
          >
            <span className="text-white/40 text-xs tracking-widest uppercase">Scroll</span>
            <ChevronDown className="w-5 h-5 text-white/40" />
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 2. CATEGORIES SECTION                                             */}
        {/* ================================================================ */}
        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-10">
              <p className="text-[#e94560] tracking-widest uppercase text-sm font-semibold mb-2">
                Curated for You
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900">
                Shop by Category
              </h2>
            </motion.div>

            <motion.div variants={fadeInUp}>
              {categoriesLoading ? (
                <CategorySkeleton />
              ) : (
                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {(categories ?? []).map((cat) => (
                    <motion.div
                      key={cat.id}
                      className="relative min-w-[200px] sm:min-w-[240px] h-48 rounded-2xl flex-shrink-0 snap-start cursor-pointer overflow-hidden group"
                      style={
                        cat.image
                          ? {
                              backgroundImage: `url(${cat.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {
                              background:
                                'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                            }
                      }
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      onClick={() => navigate(`/shop?category=${cat.slug}`)}
                    >
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                        <p className="font-bold text-lg leading-tight">{cat.name}</p>
                        <span className="text-sm text-gray-300 mt-1 group-hover:text-[#e94560] transition-colors duration-200 font-medium">
                          Shop →
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 3. FEATURED PRODUCTS SECTION                                      */}
        {/* ================================================================ */}
        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-10">
              <p className="text-[#e94560] tracking-widest uppercase text-sm font-semibold mb-2">
                Handpicked Essentials
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900">
                Featured Products
              </h2>
            </motion.div>

            <motion.div variants={fadeInUp}>
              {productsLoading ? (
                <ProductSkeleton />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                  {(featuredProducts ?? []).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </motion.div>

            {/* View All CTA */}
            <motion.div
              variants={fadeInUp}
              className="flex justify-center mt-12"
            >
              <button
                onClick={() => navigate('/shop')}
                className="border-2 border-gray-900 text-gray-900 px-10 py-4 rounded-full font-bold text-base hover:bg-gray-900 hover:text-white transition-all duration-300 active:scale-95"
              >
                View All Products
              </button>
            </motion.div>
          </motion.div>
        </section>


        {/* ================================================================ */}
        {/* 5. TRUST BADGES SECTION                                           */}
        {/* ================================================================ */}
        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-5"
          >
            {trustBadges.map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={fadeInUp}
                className="flex flex-col items-center text-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full bg-[#e94560]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7 text-[#e94560]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{title}</p>
                  <p className="text-gray-500 text-sm mt-1">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

      </div>
    </AnimatePresence>
  );
}
