import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Snackbar } from "@mui/material";

import { SnackbarProvider } from "./components/AppSnackbar";
import NavigationDrawer from "./components/NavigationDrawer";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { clearTokens, fetchJsonWithAuth, getStoredUser, setStoredUser, API_URL } from "./utils/api";
import { SUPPORT_INTERNAL_PATHS } from "./data/supportTopics";
import { useThemeMode } from "./contexts/ThemeContext";

// Lazy load pages for code splitting
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddPropertyPage = lazy(() => import("./pages/AddPropertyPage"));
const PropertyFeedPage = lazy(() => import("./pages/PropertyFeedPage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const TripListPage = lazy(() => import("./pages/TripListPage"));
const ReservationListPage = lazy(() => import("./pages/ReservationListPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WishListPage = lazy(() => import("./pages/WishListPage"));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SupportResourcePage = lazy(() => import('./pages/SupportResourcePage'));
const SupportChatPage = lazy(() => import('./pages/SupportChatPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

const RouteChangeEffects = () => {
  const location = useLocation();
  const previousLocationRef = useRef(null);

  useEffect(() => {
    const currentRoute = `${location.pathname}${location.search || ""}`;
    const previousRoute = previousLocationRef.current;

    if (previousRoute && previousRoute !== currentRoute) {
      sessionStorage.setItem("previousRoute", previousRoute);
    }
    sessionStorage.setItem("currentRoute", currentRoute);
    previousLocationRef.current = currentRoute;

    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
};

function App() {
  const { cookieNoticeDismissed, dismissCookieNotice, reEnableCookieNotice } = useThemeMode();
  const [showCookieNotice, setShowCookieNotice] = useState(false);

  useEffect(() => {
    const shouldShowNotice = import.meta.env.VITE_SHOW_COOKIE_NOTICE !== 'false' && !cookieNoticeDismissed;
    setShowCookieNotice(shouldShowNotice);
  }, [cookieNoticeDismissed]);

  useEffect(() => {
    // On app load, refresh user data from server to sync localStorage/session
    const hasSession = localStorage.getItem("authSession") === "true";
    const storedUser = getStoredUser();

    if (storedUser?.id || hasSession) {
      fetchJsonWithAuth(`${API_URL}/auth/me`)
        .then(data => {
          if (data) {
            setStoredUser({
              id: data._id || data.id,
              email: data.email,
              role: data.role,
              firstName: data.firstName,
              lastName: data.lastName,
              profileImagePath: data.profileImagePath,
              hasPaid: data.hasPaid,
              phone: data.phone,
              bio: data.bio,
              isAdmin: !!data.isAdmin,
              subscriptionStatus: data.subscriptionStatus,
              subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd,
            });
          }
        })
        .catch(() => clearTokens());
    }
  }, []);

  const handleDismissCookieNotice = () => {
    dismissCookieNotice();
    setShowCookieNotice(false);
  };

  const handleKeepReminding = () => {
    reEnableCookieNotice();
    setShowCookieNotice(false);
  };

  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <NavigationDrawer>
            <RouteChangeEffects />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/register" element={<PublicRoute> <RegisterPage /> </PublicRoute>} />
                <Route path="/login" element={<PublicRoute> <LoginPage /> </PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute> <ForgotPasswordPage /> </PublicRoute>} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
                <Route path="/" element={<DashboardPage />} />
                <Route path="/add-property" element={<ProtectedRoute requiredRole="host"> <AddPropertyPage /> </ProtectedRoute>} />
                <Route path="/properties" element={<PropertyFeedPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
                <Route path="/trips" element={<ProtectedRoute requiredRole="guest"> <TripListPage /> </ProtectedRoute>} />
                <Route path="/my-listings" element={<ProtectedRoute requiredRole="host"> <Navigate to="/profile?tab=listings#listings-tab" replace /> </ProtectedRoute>} />
                <Route path="/reservations" element={<ProtectedRoute requiredRole="host"> <ReservationListPage /> </ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute> <WishListPage /> </ProtectedRoute>} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/support/chat" element={<SupportChatPage />} />
                {SUPPORT_INTERNAL_PATHS.map((path) => (
                  <Route key={path} path={path} element={<SupportResourcePage />} />
                ))}
                <Route path="/admin" element={<ProtectedRoute> <AdminPage /> </ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </Suspense>
            <Snackbar
              open={showCookieNotice}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              autoHideDuration={null}
            >
              <Alert
                severity="info"
                variant="filled"
                onClose={handleDismissCookieNotice}
                action={(
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button color="inherit" size="small" onClick={handleKeepReminding}>
                      Keep showing
                    </Button>
                    <Button color="inherit" size="small" onClick={handleDismissCookieNotice}>
                      Dismiss
                    </Button>
                  </Box>
                )}
              >
                We use secure cookies to keep you signed in and protect account actions.
              </Alert>
            </Snackbar>
          </NavigationDrawer>
        </SnackbarProvider>
      </LocalizationProvider>
     </Router>
  );
}
export default App;
