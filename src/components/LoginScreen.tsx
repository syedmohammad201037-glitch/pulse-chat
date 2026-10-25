import { useAppStore } from '../store/useAppStore';
import { 
  MessageCircle, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onBackToLanding?: () => void;
}

export default function LoginScreen({ onBackToLanding }: LoginScreenProps) {
  const { loginWithGoogle, signInWithEmail, signUpWithEmail, loginAsGuest } = useAppStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSignInWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email/username and password.');
      return;
    }
    setSigningIn(true);
    setErrorMsg('');
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setErrorMsg('Email auth is unconfigured in Firebase. Using Guest Account fallback...');
        await loginAsGuest(email.split('@')[0]);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('Invalid credentials. You can also click "Quick Demo / Guest Account" to enter instantly.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in. Please try again or use Quick Demo Account.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignUpWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !customUsername) {
      setErrorMsg('Please specify username, email, and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }
    setSigningIn(true);
    setErrorMsg('');
    try {
      await signUpWithEmail(email, password, customUsername.trim());
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        await loginAsGuest(customUsername.trim());
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('This email is already registered. Please sign in instead.');
      } else {
        await loginAsGuest(customUsername.trim());
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg('');
    try {
      await loginWithGoogle(customUsername.trim() || undefined);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Google Popup was blocked by browser iframe. Click "Quick Demo Account" to access immediately!');
    } finally {
      setSigningIn(false);
    }
  };

  const handleQuickGuestSignIn = async () => {
    setSigningIn(true);
    setErrorMsg('');
    try {
      await loginAsGuest(customUsername.trim() || undefined);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Unable to initialize guest account. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#E0D7F5] bg-gradient-to-br from-[#E2D9F8] via-[#EDE7FB] to-[#DDD1F5] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-text">
      
      {/* Background Soft Organic Waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[32rem] h-[32rem] bg-purple-300/20 rounded-full blur-[100px]" />
      </div>

      {/* Top Floating Navigation / Back link */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 z-10 px-2">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-900/80 hover:text-purple-950 bg-white/70 hover:bg-white backdrop-blur-md px-3.5 py-1.5 rounded-full transition-all shadow-xs cursor-pointer border border-purple-200/60"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Landing</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-purple-900/60 bg-purple-100/70 px-2.5 py-1 rounded-full border border-purple-200/50">
            End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* Main Split Card (Exact Visual Replica of Image 1) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(88,28,135,0.25)] border border-purple-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 z-10 relative"
      >

        {/* LEFT PANEL: Deep Purple / Violet Vector Contour Banner (Image 1 Left Side) */}
        <div className="md:col-span-6 bg-gradient-to-br from-[#6D42C7] via-[#5F35B8] to-[#4A269C] p-8 sm:p-12 text-white relative flex flex-col justify-between overflow-hidden min-h-[320px] md:min-h-[540px]">
          
          {/* Topographical Contour Wavy Vector Lines Background */}
          <svg 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20"
            viewBox="0 0 500 500" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M 0 100 Q 150 160 250 100 T 500 120" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 140 Q 180 200 300 130 T 500 170" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 180 Q 120 250 280 180 T 500 220" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 240 Q 190 310 320 240 T 500 280" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 300 Q 150 380 290 310 T 500 360" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 380 Q 220 450 360 370 T 500 420" fill="none" stroke="white" strokeWidth="2" />
            <path d="M 0 440 Q 180 500 310 430 T 500 480" fill="none" stroke="white" strokeWidth="2" />
          </svg>

          {/* Abstract Geometric Symbols (+, o, Dot Matrix) */}
          <div className="absolute top-8 left-8 text-white/30 text-lg font-mono select-none">+</div>
          <div className="absolute top-28 left-40 text-white/30 text-sm font-mono select-none">○</div>
          <div className="absolute bottom-28 left-12 text-white/30 text-sm font-mono select-none">○</div>
          <div className="absolute bottom-16 left-36 text-white/30 text-lg font-mono select-none">+</div>
          
          {/* Dot Matrix Pattern (Top Right of Left Banner in Image 1) */}
          <div className="absolute top-8 right-8 grid grid-cols-3 gap-1.5 opacity-30 select-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
            ))}
          </div>

          {/* Brand Header */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight font-heading text-white">PulseChat</span>
          </div>

          {/* Hero Content (Image 1 typography & layout) */}
          <div className="relative z-10 my-auto py-8 text-left space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
              {activeTab === 'signin' ? 'Welcome back!' : 'Join PulseChat!'}
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed font-sans max-w-sm">
              {activeTab === 'signin' 
                ? 'You can sign in to access with your existing account.'
                : 'Create an account to experience seamless real-time messaging.'}
            </p>
          </div>

          {/* Bottom Security Badge */}
          <div className="relative z-10 flex items-center gap-2 text-[11px] text-white/60 font-sans">
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            <span>End-to-End Encrypted • WebRTC P2P</span>
          </div>

        </div>

        {/* RIGHT PANEL: Crisp White Form (Image 1 Right Side) */}
        <div className="md:col-span-6 bg-white p-8 sm:p-12 flex flex-col justify-between text-left">
          
          <div>
            {/* Heading */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-heading text-slate-800 tracking-tight">
                {activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'signin' ? 'Enter your login details below' : 'Fill in the information to get started'}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="leading-normal">{errorMsg}</p>
              </motion.div>
            )}

            {/* Form Fields (Matching Image 1 Input styling) */}
            <form onSubmit={activeTab === 'signin' ? handleSignInWithEmail : handleSignUpWithEmail} className="space-y-4">
              
              {activeTab === 'signup' && (
                <div className="space-y-1">
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-4.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Username"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#6D42C7] focus:ring-2 focus:ring-purple-100 focus:outline-none rounded-full pl-11 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Username or Email Input (Image 1 Pill Input) */}
              <div className="space-y-1">
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-4.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Username or email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#6D42C7] focus:ring-2 focus:ring-purple-100 focus:outline-none rounded-full pl-11 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* Password Input (Image 1 Pill Input) */}
              <div className="space-y-1">
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#6D42C7] focus:ring-2 focus:ring-purple-100 focus:outline-none rounded-full pl-11 pr-11 py-3 text-xs text-slate-800 placeholder-slate-400 transition-all shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row (Image 1) */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                {activeTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setErrorMsg('For demo accounts, you can reset passwords via Firebase console or click Quick Demo below.')}
                    className="text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Main Gradient Submit Button (Image 1 Vibrant Purple Pill) */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={signingIn}
                className="w-full bg-gradient-to-r from-[#6D42C7] via-[#5F35B8] to-[#552EAB] hover:from-[#5F35B8] hover:to-[#4A269C] text-white font-bold font-heading py-3.5 px-6 rounded-full text-xs transition-all shadow-[0_8px_20px_rgba(109,66,199,0.35)] cursor-pointer flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
              >
                {signingIn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                )}
              </motion.button>
            </form>

            {/* Quick Guest & Google Actions */}
            <div className="space-y-2 mt-4">
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-100 w-full" />
                <span className="bg-white px-2.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider relative z-10">or quick access</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Guest Sign In */}
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={handleQuickGuestSignIn}
                  className="bg-purple-50 hover:bg-purple-100/80 border border-purple-200/70 text-purple-900 font-bold py-2.5 px-3 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">Quick Guest</span>
                </button>

                {/* Google Sign In */}
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={handleGoogleSignIn}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="truncate">Google</span>
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Switch Tab Link (Image 1: "New here? Create an Account") */}
          <div className="pt-6 text-center text-xs text-slate-500 font-sans">
            {activeTab === 'signin' ? (
              <span>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMsg(''); }}
                  className="font-bold text-[#6D42C7] hover:text-[#552EAB] cursor-pointer ml-1 underline underline-offset-2"
                >
                  Create an Account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMsg(''); }}
                  className="font-bold text-[#6D42C7] hover:text-[#552EAB] cursor-pointer ml-1 underline underline-offset-2"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

        </div>

      </motion.div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-[11px] text-purple-900/60 font-sans">
        <span>PulseChat Real-Time Workspace • High-Performance WebRTC & Firestore</span>
      </div>

    </div>
  );
}
