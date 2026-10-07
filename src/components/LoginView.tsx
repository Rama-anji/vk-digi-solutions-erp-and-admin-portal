import React, { useState } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, password: string, remember?: boolean) => Promise<void>;
  backendError?: string;
  onOpenCodeViewer: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onOpenCodeViewer, backendError }) => {
  const [email, setEmail] = useState('admin@vkdsolutions.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  const [busy,setBusy] = useState(false);
  const [showHelp,setShowHelp] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try { await onLogin(email,password,remember); }
    catch (error: any) { setError(error.message || 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-800">
      
      {/* Top Brand Header Bar */}
      <header className="w-full bg-white border-b border-slate-200 py-3.5 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#004077] flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-900/20">
              <span>VK</span>
            </div>
            <div>
              <h1 className="font-bold text-[#004077] text-lg leading-tight tracking-tight">VK Digi Solutions</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">VKD Business Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenCodeViewer}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#004077] border border-blue-200/80 rounded-xl text-xs font-semibold transition"
            >
              Code &amp; SQL
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Private administrator access</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-[#E5E7EB] p-8 sm:p-10 relative overflow-hidden">
            
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#004077] via-[#00355F] to-[#EF7C00]"></div>

            {/* Heading */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#004077] mb-3 border border-blue-100">
                <Shield size={28} className="text-[#004077]" />
              </div>
              <h2 className="text-2xl font-black text-[#004077] tracking-tight">Sign in to VKD</h2>
              
            </div>

            {/* Error Message */}
            {(error || backendError) && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <span role="alert">{error || backendError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Work Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    id="login-email" aria-label="Email" autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@vkdsolutions.com"
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button type="button" onClick={()=>setShowHelp(!showHelp)} aria-expanded={showHelp} className="text-xs font-medium text-[#EF7C00] hover:underline">Forgot password?</button>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="login-password" aria-label="Password" autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded text-[#004077] focus:ring-[#004077] border-slate-300"
                  />
                  <span>Keep me signed in for 7 days</span>
                </label>
              </div>

              {/* Submit CTA Button (Accent Orange #EF7C00) */}
              <button
                type="submit" aria-label="Sign in" disabled={busy} aria-busy={busy}
                className="w-full py-3.5 px-6 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-60 disabled:cursor-wait transition flex items-center justify-center space-x-2 text-sm tracking-wide"
              >
                <span>{busy ? 'Signing in…' : 'Sign in'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {showHelp && <div className="mt-6 pt-6 border-t border-slate-100">
              
              {showHelp && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Contact your administrator to reset your password. If you are already signed in on another device, open Integrations &amp; Settings to change it.</p>}
            </div>}

          </div>

          <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
            <p>&copy; {new Date().getFullYear()} VK Digi Solutions. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">Clients &bull; Projects &bull; Billing &bull; People</p>
          </div>

        </div>
      </main>

    </div>
  );
};
