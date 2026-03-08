import React from 'react';
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard';
import { useSnackbar } from '../components/AppSnackbar';

export default function AnalyticsDashboardPage() {
  const snackbar = useSnackbar();
  return <AnalyticsDashboard snackbar={snackbar} />;
}
