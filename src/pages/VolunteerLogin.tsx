import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabaseClient';
import OmniAIAssistant from '../components/OmniAIAssistant';

export default function VolunteerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShake(false);
    
    // Simulate API delay
    await new Promise(res => setTimeout(res, 800));

    if (!email || !password) {
      setShake(true);
      setIsLoading(false);
      return;
    }

    // Use the persistent signUp/signIn logic from mock Supabase
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
       email,
       password
    });

    if (signInError) {
       // If login fails, try to auto-signup for volunteers to make it easy
       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
       
       if (!signUpError && signUpData.user) {
         // Create the public user profile with the correct role
         await supabase.from('users').insert([{
           id: signUpData.user.id,
           email: email,
           name: email.split('@')[0], // Fallback name
           role: 'volunteer',
           address: 'Volunteer Station'
         }]);
         navigate('/volunteer-dashboard');
       } else {
         toast(signUpError?.message || 'Login failed', 'error');
         setShake(true);
       }
    } else {
       // Check if profile exists, if not create it (safe guard)
       const { data: profile } = await supabase.from('users').select('role').eq('id', signInData.user.id).single();
       if (!profile) {
         await supabase.from('users').insert([{
           id: signInData.user.id,
           email: email,
           name: email.split('@')[0],
           role: 'volunteer'
         }]);
       }
       navigate('/volunteer-dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg)] relative">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#008C44] transition-all duration-300 text-[var(--color-text-main)] text-xs font-bold shadow-sm"
        >
          <span className="text-sm">{theme === 'light' ? '☀️' : '🌙'}</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className="w-full max-w-[420px]">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)] flex items-center justify-center mb-5 shadow-[0_8px_30px_rgba(0, 140, 68,0.3)] animate-float"
          >
            <Leaf className="text-[var(--color-bg)] w-10 h-10" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[36px] font-bold text-[var(--color-text-main)] mb-2 tracking-tight"
          >
            Re-Plate
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[var(--color-primary)] text-[15px] font-medium flex items-center gap-1.5"
          >
            <span className="text-xl">✨</span> Reduce waste. Feed communities.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-4 px-3 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-full"
          >
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Volunteer Portal</span>
          </motion.div>
        </div>

        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
          onSubmit={handleSubmit} 
          className="space-y-6 w-full relative z-10 flex flex-col"
        >
          
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} initial="hidden" animate="show" className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-main)] rounded-2xl h-[60px] px-5 outline-none transition-all shadow-sm" 
              placeholder="volunteer@re-plate.org" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </motion.div>
          
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Password</label>
            <input 
              type="password"
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-main)] rounded-2xl h-[60px] px-5 outline-none tracking-[0.2em] font-bold transition-all shadow-sm" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </motion.div>
          
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="pt-6">
            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="w-full h-[60px] rounded-2xl btn-primary text-[#0B0F19] font-bold text-lg flex items-center justify-center gap-2 transition-shadow duration-300 relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex space-x-1 items-center justify-center">
                  <motion.div className="w-2 h-2 bg-white rounded-full bg-opacity-80" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                  <motion.div className="w-2 h-2 bg-white rounded-full bg-opacity-80" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                  <motion.div className="w-2 h-2 bg-white rounded-full bg-opacity-80" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                </div>
              ) : (
                <>
                  <span>Login Area</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.form>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center mt-8 text-sm text-[var(--color-text-muted)] font-medium group"
        >
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--color-text-main)] font-bold relative inline-block">
            Register now
            <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-[#008C44] transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </motion.p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 flex justify-center"
        >
           <Link to="/login" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors py-2 px-4 rounded-full border border-transparent hover:border-[var(--color-primary)]/30">
              Back to Standard Login
           </Link>
        </motion.div>
      </div>

      <OmniAIAssistant role="volunteer" />
    </div>
  );
}
