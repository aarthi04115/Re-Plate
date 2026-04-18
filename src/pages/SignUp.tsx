import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from '../components/Icons';
import { supabase } from '../services/supabaseClient';
import type { Role } from '../types';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../components/Toast';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: ''
  });
  const [role, setRole] = useState<Role>('donor');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) {
        toast(authError.message, 'error');
        setIsLoading(false);
        return;
      }

      const user = data.user;

      if (!user) {
        toast("User not created", 'error');
        setIsLoading(false);
        return;
      }

      // Now insert into public.users using SAME ID
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id,
          name: formData.name,
          email: formData.email,
          role: role,
          phone: formData.phone,
          address: formData.location
        }
      ]);

      if (insertError) {
        toast(insertError.message, 'error');
        setIsLoading(false);
        return;
      }

      toast("Signup successful! Welcome to Re-Plate.", 'success');
      navigate(`/${role}-dashboard`);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
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

      <div className="w-full max-w-[420px] pb-10">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#008C44] to-[#008C44] flex items-center justify-center mb-4 shadow-[0_8px_30px_rgba(0, 140, 68,0.3)] animate-float">
            <Leaf className="text-white w-8 h-8" />
          </div>
          <h1 className="text-[28px] font-bold text-[var(--color-text-main)] tracking-tight">Join Re-Plate</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 w-full relative z-10 flex flex-col">
          {error && (
            <div className="p-3 bg-[#008C44]/40 text-[#008C44] border border-[#008C44]/50 rounded-2xl text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Full Name</label>
               <input 
                 type="text" 
                 name="name"
                 required
                 className="input-field h-[54px]" 
                 placeholder="John Doe" 
                 value={formData.name}
                 onChange={handleChange}
               />
             </div>
             <div className="space-y-1.5">
               <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Phone</label>
               <input 
                 type="text" 
                 name="phone"
                 required
                 className="input-field h-[54px]" 
                 placeholder="(555) 000-0000" 
                 value={formData.phone}
                 onChange={handleChange}
               />
             </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Location</label>
            <input 
              type="text" 
              name="location"
              required
              className="input-field h-[54px]" 
              placeholder="e.g. Tambaram" 
              value={formData.location}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Email</label>
            <input 
              type="email" 
              name="email"
              required
              className="input-field h-[54px]" 
              placeholder="you@example.com" 
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4">Password</label>
            <input 
              type="password"
              name="password"
              required
              className="input-field h-[54px] tracking-[0.2em] font-bold" 
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="pt-4">
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase ml-4 mb-3">I AM A...</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Donor */}
              <div 
                className={`role-card flex flex-col items-center justify-center text-center py-3 ${role === 'donor' ? 'selected' : ''}`}
                onClick={() => setRole('donor')}
              >
                <span className="text-xl mb-1">🥗</span>
                <span className="font-bold text-[var(--color-text-main)] text-[11px]">Donor</span>
                <span className="text-[9px] text-[var(--color-text-muted)] leading-none mt-1">Share food</span>
              </div>
              {/* NGO/Receiver */}
              <div 
                className={`role-card flex flex-col items-center justify-center text-center py-3 ${role === 'ngo' ? 'selected' : ''}`}
                onClick={() => setRole('ngo')}
              >
                <div className="flex flex-col items-center">
                   <span className="text-xl mb-1">🏢</span>
                   <span className="font-bold text-[var(--color-text-main)] text-[11px]">NGO/Receiver</span>
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] leading-none mt-1">Collect/Find</span>
              </div>
              {/* Volunteer */}
              <div 
                className={`role-card flex flex-col items-center justify-center text-center py-3 ${role === 'volunteer' ? 'selected' : ''}`}
                onClick={() => setRole('volunteer')}
              >
                <span className="text-xl mb-1">🛵</span>
                <span className="font-bold text-[var(--color-text-main)] text-[11px]">Volunteer</span>
                <span className="text-[9px] text-[var(--color-text-muted)] leading-none mt-1">Deliver food</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative">
            <button 
              type="submit" 
              className="btn-primary flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Registering...' : 'Sign Up'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>

          </div>
        </form>

        <p className="text-center mt-12 text-sm text-[var(--color-text-muted)] font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-text-main)] font-bold hover:text-[var(--color-primary)] transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
