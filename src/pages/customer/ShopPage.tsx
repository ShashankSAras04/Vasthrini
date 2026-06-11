import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Filter,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import type { Product, Category, Brand } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids', 'Boys', 'Girls'] as const;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating' },
] as const;
const PAGE_SIZE = 16;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

// ─── Helper: read / write URL params ─────────────────────────────────────────
function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => ({
    search: searchParams.get('search') ?? '',
    gender: searchParams.getAll('gender'),
    category: searchParams.get('category') ?? '',
    brand: searchParams.get('brand') ?? '',
    filter: searchParams.get('filter') ?? '', // 'new' | 'sale' | ''
    page: Number(searchParams.get('page') ?? 1),
    sort: (searchParams.get('sort') ?? 'newest') as SortOption,
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
  }), [searchParams]);

  const setParams = (updates: Partial<typeof params>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (key === 'gender' && Array.isArray(val)) {
          next.delete('gender');
          (val as string[]).forEach(g => next.append('gender', g));
        } else if (val === '' || val === null || val === undefined || val === 1) {
          if (key === 'page') next.delete(key);
          else next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      // always reset page when filters change (unless page is explicitly being set)
      if (!('page' in updates)) next.delete('page');
      return next;
    });
  };

  return { params, setParams };
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-gray-100 animate-pulse overflow-hidden">
      <div className="h-64 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors"
      >
        {title}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter panel content (shared between sidebar & mobile drawer) ────────────
function FilterPanel({
  params,
  setParams,
  categories,
  brands,
}: {
  params: ReturnType<typeof useFilterParams>['params'];
  setParams: ReturnType<typeof useFilterParams>['setParams'];
  categories: Category[];
  brands: Brand[];
}) {
  const [localMin, setLocalMin] = useState(params.minPrice);
  const [localMax, setLocalMax] = useState(params.maxPrice);

  // sync if URL changes externally
  useEffect(() => { setLocalMin(params.minPrice); }, [params.minPrice]);
  useEffect(() => { setLocalMax(params.maxPrice); }, [params.maxPrice]);

  const applyPrice = () => {
    setParams({ minPrice: localMin, maxPrice: localMax });
  };

  const toggleGender = (g: string) => {
    const next = params.gender.includes(g)
      ? params.gender.filter(x => x !== g)
      : [...params.gender, g];
    setParams({ gender: next });
  };

  return (
    <div className="space-y-0">
      {/* Sort */}
      <FilterSection title="Sort By">
        <select
          value={params.sort}
          onChange={e => setParams({ sort: e.target.value as SortOption })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="category"
              checked={params.category === ''}
              onChange={() => setParams({ category: '' })}
              className="accent-rose-500"
            />
            All Categories
          </label>
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="category"
                checked={params.category === String(cat.id)}
                onChange={() => setParams({ category: String(cat.id) })}
                className="accent-rose-500"
              />
              {cat.name}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Gender">
        <div className="space-y-2">
          {GENDER_OPTIONS.map(g => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={params.gender.includes(g)}
                onChange={() => toggleGender(g)}
                className="accent-rose-500 rounded"
              />
              {g}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price range */}
      <FilterSection title="Price Range">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={e => setLocalMin(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={e => e.key === 'Enter' && applyPrice()}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            min={0}
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={e => setLocalMax(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={e => e.key === 'Enter' && applyPrice()}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            min={0}
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-2 w-full text-xs text-rose-600 font-medium hover:text-rose-800 transition-colors"
        >
          Apply
        </button>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Brand" defaultOpen={false}>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="brand"
              checked={params.brand === ''}
              onChange={() => setParams({ brand: '' })}
              className="accent-rose-500"
            />
            All Brands
          </label>
          {brands.map(b => (
            <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="brand"
                checked={params.brand === String(b.id)}
                onChange={() => setParams({ brand: String(b.id) })}
                className="accent-rose-500"
              />
              {b.name}
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const navigate = useNavigate();
  const { params, setParams } = useFilterParams();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(
          '*, images:product_images(*), category:categories(*), brand:brands(*), variants:product_variants(*)'
        )
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...allProducts];

    // search
    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        p =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // gender
    if (params.gender.length > 0) {
      result = result.filter(p =>
        params.gender.some(
          g => p.gender?.toLowerCase() === g.toLowerCase()
        )
      );
    }

    // category
    if (params.category) {
      result = result.filter(p => String(p.category_id) === params.category);
    }

    // brand
    if (params.brand) {
      result = result.filter(p => String(p.brand_id) === params.brand);
    }

    // price range
    if (params.minPrice) {
      const min = parseFloat(params.minPrice);
      result = result.filter(p => (p.discount_price ?? p.price) >= min);
    }
    if (params.maxPrice) {
      const max = parseFloat(params.maxPrice);
      result = result.filter(p => (p.discount_price ?? p.price) <= max);
    }

    // filter chips
    if (params.filter === 'sale') {
      result = result.filter(p => p.discount_price != null);
    } else if (params.filter === 'new') {
      result = result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // sort
    switch (params.sort) {
      case 'newest':
        result = result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'price_asc':
        result = result.sort(
          (a, b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price)
        );
        break;
      case 'price_desc':
        result = result.sort(
          (a, b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price)
        );
        break;
      case 'rating':
        result = result.sort(
          (a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0)
        );
        break;
    }

    return result;
  }, [allProducts, params]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goToPage = (p: number) => {
    setParams({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Active filter chips ────────────────────────────────────────────────────
  type Chip = { label: string; onRemove: () => void };
  const chips: Chip[] = [];

  if (params.search) {
    chips.push({ label: `"${params.search}"`, onRemove: () => setParams({ search: '' }) });
  }
  if (params.filter === 'sale') {
    chips.push({ label: 'On Sale', onRemove: () => setParams({ filter: '' }) });
  }
  if (params.filter === 'new') {
    chips.push({ label: 'New Arrivals', onRemove: () => setParams({ filter: '' }) });
  }
  params.gender.forEach(g => {
    chips.push({
      label: g,
      onRemove: () =>
        setParams({ gender: params.gender.filter(x => x !== g) }),
    });
  });
  if (params.category) {
    const cat = categories.find(c => String(c.id) === params.category);
    if (cat) chips.push({ label: cat.name, onRemove: () => setParams({ category: '' }) });
  }
  if (params.brand) {
    const b = brands.find(br => String(br.id) === params.brand);
    if (b) chips.push({ label: b.name, onRemove: () => setParams({ brand: '' }) });
  }
  if (params.minPrice || params.maxPrice) {
    const label = [
      params.minPrice ? `₹${params.minPrice}` : '',
      params.maxPrice ? `₹${params.maxPrice}` : '',
    ]
      .filter(Boolean)
      .join(' – ');
    chips.push({
      label: `Price: ${label}`,
      onRemove: () => setParams({ minPrice: '', maxPrice: '' }),
    });
  }

  const clearAll = () => {
    navigate('/shop');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
          <motion.aside
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="hidden lg:block w-60 xl:w-72 flex-shrink-0"
          >
            <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal size={16} className="text-rose-500" />
                <h2 className="font-bold text-gray-900 text-base">Filters</h2>
              </div>
              <FilterPanel
                params={params}
                setParams={setParams}
                categories={categories}
                brands={brands}
              />
            </div>
          </motion.aside>

          {/* ── Main content ───────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Page heading */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900">
                {params.filter === 'sale'
                  ? 'Sale'
                  : params.filter === 'new'
                  ? 'New Arrivals'
                  : params.search
                  ? `Results for "${params.search}"`
                  : params.category
                  ? (categories.find(c => String(c.id) === params.category)?.name ?? 'Shop')
                  : 'Shop'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading ? 'Loading…' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {chips.map(chip => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-medium px-3 py-1.5 rounded-full border border-rose-200"
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      className="ml-0.5 hover:text-rose-900 transition-colors"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 underline hover:text-gray-800 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ShoppingBag size={56} className="text-gray-300 mb-4" strokeWidth={1.2} />
                <h3 className="text-lg font-semibold text-gray-600 mb-1">No products found</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Try adjusting or clearing your filters to discover more products.
                </p>
                <button
                  onClick={clearAll}
                  className="mt-5 px-5 py-2.5 bg-rose-500 text-white rounded-full text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === p
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Mobile: floating filter button ──────────────────────────────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-rose-500 text-white px-5 py-3 rounded-full shadow-lg font-medium text-sm hover:bg-rose-600 active:scale-95 transition-all"
        >
          <Filter size={16} />
          Filters
          {chips.length > 0 && (
            <span className="ml-1 bg-white text-rose-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {chips.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile filter drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-up drawer */}
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col lg:hidden"
            >
              {/* Drawer handle */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-rose-500" />
                  <span className="font-bold text-gray-900">Filters</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-5 pb-6">
                <FilterPanel
                  params={params}
                  setParams={setParams}
                  categories={categories}
                  brands={brands}
                />
              </div>

              {/* Apply button */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full bg-rose-500 text-white py-3 rounded-full font-semibold text-sm hover:bg-rose-600 transition-colors"
                >
                  Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
