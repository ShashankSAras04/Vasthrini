import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email').min(1, 'Email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Google Icon SVG ──────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M43.611 20.083H42V20H24v8h11.303C33.973 32.515 29.418 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      fill="#FFC107"
    />
    <path
      d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      fill="#FF3D00"
    />
    <path
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.396 0-9.942-3.466-11.29-8.24l-6.516 5.021C9.505 39.556 16.227 44 24 44z"
      fill="#4CAF50"
    />
    <path
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l6.19 5.238C42.021 35.592 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"
      fill="#1976D2"
    />
  </svg>
);

// ─── Reusable Input Field ─────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon: React.ReactNode;
  error?: string;
  rightElement?: React.ReactNode;
  registration: object;
}

const InputField = ({
  id,
  label,
  type = 'text',
  placeholder,
  icon,
  error,
  rightElement,
  registration,
}: InputFieldProps) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-4 py-3 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-[#e94560]/40 focus:border-[#e94560] ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
        } ${rightElement ? 'pr-10' : ''}`}
        {...registration}
      />
      {rightElement && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</span>
      )}
    </div>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

// ─── Login Form ───────────────────────────────────────────────────────────────

const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Admin bypass credentials check
      const inputEmail = values.email.trim().toLowerCase();
      if (inputEmail === 'admin@gmail.com' && values.password === 'admin@12345') {
        const mockUser = {
          id: 'admin-bypass-id',
          email: 'admin@gmail.com',
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: { first_name: 'Admin', last_name: 'User' },
          created_at: new Date().toISOString(),
        } as any;
        
        const mockProfile = {
          id: 'admin-bypass-id',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          email: 'admin@gmail.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any;

        const { setUser, setSession, setProfile } = useAuthStore.getState();
        setUser(mockUser);
        setProfile(mockProfile);
        setSession({
          user: mockUser,
          access_token: 'mock-admin-token',
          refresh_token: 'mock-admin-token',
          expires_in: 3600,
          token_type: 'bearer',
        } as any);

        toast.success('Welcome back, Admin!');
        navigate('/admin');
        return;
      }

      // Normal Supabase authentication
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <InputField
        id="login-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        icon={<Mail size={16} />}
        error={errors.email?.message}
        registration={register('email')}
      />

      <InputField
        id="login-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        icon={<Lock size={16} />}
        error={errors.password?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        registration={register('password')}
      />

      <div className="flex justify-end -mt-2">
        <button
          type="button"
          className="text-xs text-[#e94560] hover:underline font-medium transition"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-[#1a1a2e] hover:bg-[#e94560] transition rounded-xl w-full py-3 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Signing In…
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-[#e94560] font-semibold hover:underline transition"
        >
          Create one
        </button>
      </p>
    </form>
  );
};

// ─── Register Form ────────────────────────────────────────────────────────────

const RegisterForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
          },
        },
      });
      if (error) throw error;
      toast.success('Account created! Welcome to Vastrini 🎉');
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <InputField
          id="reg-first-name"
          label="First Name"
          placeholder="John"
          icon={<User size={16} />}
          error={errors.first_name?.message}
          registration={register('first_name')}
        />
        <InputField
          id="reg-last-name"
          label="Last Name"
          placeholder="Doe"
          icon={<User size={16} />}
          error={errors.last_name?.message}
          registration={register('last_name')}
        />
      </div>

      <InputField
        id="reg-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        icon={<Mail size={16} />}
        error={errors.email?.message}
        registration={register('email')}
      />

      <InputField
        id="reg-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        icon={<Lock size={16} />}
        error={errors.password?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        registration={register('password')}
      />

      <InputField
        id="reg-confirm-password"
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="••••••••"
        icon={<Lock size={16} />}
        error={errors.confirm_password?.message}
        rightElement={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        registration={register('confirm_password')}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="bg-[#1a1a2e] hover:bg-[#e94560] transition rounded-xl w-full py-3 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-1"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Creating Account…
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-[#e94560] font-semibold hover:underline transition"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

// ─── Hero Panel ───────────────────────────────────────────────────────────────

const HeroPanel = () => (
  <div
    className="hidden lg:flex flex-col items-center justify-center flex-1 min-h-screen px-12 py-16 relative overflow-hidden"
    style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)' }}
  >
    {/* Decorative blurred circles */}
    <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-[#e94560]/20 blur-3xl pointer-events-none" />
    <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full bg-[#1a1a2e]/40 blur-3xl pointer-events-none" />

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative z-10 flex flex-col items-center text-center gap-6 max-w-md"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <span className="text-white font-black text-xl tracking-tight">V</span>
        </div>
        <span className="text-white font-black text-3xl tracking-widest uppercase">Vastrini</span>
      </div>

      <p className="text-white/60 text-sm font-medium tracking-[0.3em] uppercase">
        Wear Your Story
      </p>

      <div className="w-16 h-px bg-white/30 my-2" />

      <p className="text-white/80 text-base leading-relaxed">
        Discover timeless fashion crafted for every story. From everyday essentials to statement
        pieces — find your signature style.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {['Free Shipping', 'Easy Returns', 'Curated Collections', 'Secure Checkout'].map((feat) => (
          <span
            key={feat}
            className="text-xs bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 rounded-full px-3 py-1 font-medium"
          >
            {feat}
          </span>
        ))}
      </div>
    </motion.div>
  </div>
);

// ─── Tab Toggle ───────────────────────────────────────────────────────────────

interface TabToggleProps {
  activeTab: 'login' | 'register';
  onSwitch: (tab: 'login' | 'register') => void;
}

const TabToggle = ({ activeTab, onSwitch }: TabToggleProps) => (
  <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
    {(['login', 'register'] as const).map((tab) => (
      <button
        key={tab}
        type="button"
        onClick={() => onSwitch(tab)}
        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
          activeTab === tab
            ? 'bg-white text-[#1a1a2e] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {tab === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    ))}
  </div>
);

// ─── Auth Page ────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Redirect if already logged in
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Hero Panel ── */}
      <HeroPanel />

      {/* ── Right: Auth Form Panel ── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 bg-gray-50 lg:max-w-xl xl:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
              <span className="text-white font-black text-base">V</span>
            </div>
            <span className="text-[#1a1a2e] font-black text-2xl tracking-widest uppercase">
              Vastrini
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-[#1a1a2e] tracking-tight">
                {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'login'
                  ? 'Sign in to continue shopping your story.'
                  : 'Join Vastrini and start your fashion journey.'}
              </p>
            </div>

            {/* Tab Toggle */}
            <TabToggle
              activeTab={activeTab}
              onSwitch={(tab) => setActiveTab(tab)}
            />

            {/* Animated Form Switch */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
              >
                {activeTab === 'login' ? (
                  <LoginForm onSwitch={() => setActiveTab('register')} />
                ) : (
                  <RegisterForm onSwitch={() => setActiveTab('login')} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            By continuing, you agree to Vastrini&apos;s{' '}
            <span className="underline cursor-pointer hover:text-gray-600 transition">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:text-gray-600 transition">
              Privacy Policy
            </span>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
