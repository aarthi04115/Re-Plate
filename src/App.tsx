import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DonationProvider } from './context/DonationContext';
import { RealtimeSidebar } from './components/RealtimeSidebar';
import { ToastContainer } from './components/Toast';

import Login from './pages/Login';
import VolunteerLogin from './pages/VolunteerLogin';
import SignUp from './pages/SignUp';
import DonorDashboard from './pages/DonorDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NGODashboard from './pages/NGODashboard';
import ImpactDashboard from './pages/ImpactDashboard';
import VolunteerImpactDashboard from './pages/VolunteerImpactDashboard';
import Profile from './pages/Profile';

// ── Role‑aware protected route ─────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    return <Navigate to={`/${user.role}-dashboard`} replace />;
  }
  return <>{children}</>;
};

// ── Page transition wrapper ────────────────────────────────
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 20, scale: 0.98 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: -20, scale: 0.98 }}
    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

// ── All routes ─────────────────────────────────────────────
const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Auth routes */}
        <Route path="/login"          element={<PageWrapper>{user ? <Navigate to={`/${user.role}-dashboard`} replace /> : <Login />}</PageWrapper>} />
        <Route path="/volunteer-login" element={<PageWrapper>{user ? <Navigate to={`/${user.role}-dashboard`} replace /> : <VolunteerLogin />}</PageWrapper>} />
        <Route path="/signup"         element={<PageWrapper>{user ? <Navigate to={`/${user.role}-dashboard`} replace /> : <SignUp />}</PageWrapper>} />

        {/* ── Dashboard routes (each role has its own page) ── */}
        <Route path="/donor-dashboard"
          element={<ProtectedRoute allowedRoles={['donor']}><PageWrapper><DonorDashboard /></PageWrapper></ProtectedRoute>}
        />
        <Route path="/ngo-dashboard"
          element={<ProtectedRoute allowedRoles={['ngo', 'receiver']}><PageWrapper><NGODashboard /></PageWrapper></ProtectedRoute>}
        />
        <Route path="/volunteer-dashboard"
          element={<ProtectedRoute allowedRoles={['volunteer']}><PageWrapper><VolunteerDashboard /></PageWrapper></ProtectedRoute>}
        />
        <Route path="/receiver-dashboard"
          element={<Navigate to="/ngo-dashboard" replace />}
        />

        {/* ── Impact / Analytics pages ── */}
        <Route path="/impact"
          element={<ProtectedRoute allowedRoles={['donor', 'ngo']}><PageWrapper><ImpactDashboard /></PageWrapper></ProtectedRoute>}
        />
        <Route path="/ngo-impact"
          element={<ProtectedRoute allowedRoles={['ngo', 'receiver']}><PageWrapper><ImpactDashboard /></PageWrapper></ProtectedRoute>}
        />
        <Route path="/volunteer-impact"
          element={<ProtectedRoute allowedRoles={['volunteer']}><PageWrapper><VolunteerImpactDashboard /></PageWrapper></ProtectedRoute>}
        />

        {/* ── Profile page ── */}
        <Route path="/profile"
          element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>}
        />

        {/* ── Root: redirect to role‑specific dashboard ── */}
        <Route path="/"
          element={<PageWrapper>{!user ? <Navigate to="/login" replace /> : <Navigate to={`/${user.role}-dashboard`} replace />}</PageWrapper>}
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DonationProvider>
          <BrowserRouter>
            <AppRoutes />
            {/* Global overlays */}
            <RealtimeSidebar />
            <ToastContainer />
          </BrowserRouter>
        </DonationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
