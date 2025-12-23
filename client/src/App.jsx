import { lazy, Suspense } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { SnackbarProvider } from "./components/AppSnackbar";
import NavigationDrawer from "./components/NavigationDrawer";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages for code splitting
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddPropertyPage = lazy(() => import("./pages/AddPropertyPage"));
const PropertyFeedPage = lazy(() => import("./pages/PropertyFeedPage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const TripListPage = lazy(() => import("./pages/TripListPage"));
const HostListingsPage = lazy(() => import("./pages/HostListingsPage"));
const ReservationListPage = lazy(() => import("./pages/ReservationListPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WishListPage = lazy(() => import("./pages/WishListPage"));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <NavigationDrawer>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute> <DashboardPage /> </ProtectedRoute>} />
                <Route path="/add-property" element={<ProtectedRoute> <AddPropertyPage /> </ProtectedRoute>} />
                <Route path="/properties" element={<PropertyFeedPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
                <Route path="/trips" element={<ProtectedRoute requiredRole="guest"> <TripListPage /> </ProtectedRoute>} />
                <Route path="/my-listings" element={<ProtectedRoute> <HostListingsPage /> </ProtectedRoute>} />
                <Route path="/reservations" element={<ProtectedRoute> <ReservationListPage /> </ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute> <WishListPage /> </ProtectedRoute>} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </Suspense>
          </NavigationDrawer>
        </SnackbarProvider>
      </LocalizationProvider>
     </Router>
  );
}
export default App;
