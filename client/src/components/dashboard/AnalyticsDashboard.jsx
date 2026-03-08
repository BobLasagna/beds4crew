import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { API_URL, fetchWithAuth } from '../../utils/api';
import {
  applyAnalyticsFilters,
  buildFilterOptions,
  buildHeatmapMatrix,
  buildLatencyScatter,
  buildRequestFlowSankey,
  computeDeviceBreakdown,
  computeLatencyDistribution,
} from '../../lib/analyticsTransforms';
import { generateMockAnalyticsData } from '../../lib/mockAnalyticsData';
import { ANALYTICS_ALL_OPTION, STATUS_CATEGORIES } from '../../types/analytics';
import RouteTrafficHeatmap from '../charts/RouteTrafficHeatmap';
import RoutePerformanceDistribution from '../charts/RoutePerformanceDistribution';
import RequestFlowSankey from '../charts/RequestFlowSankey';
import LatencyScatterPlot from '../charts/LatencyScatterPlot';
import DeviceBreakdownChart from '../charts/DeviceBreakdownChart';

const MAX_FETCH_EVENTS = 2000;
const PAGE_LIMIT = 200;

const StatCard = ({ label, value }) => (
  <Card sx={{ border: 1, borderColor: 'divider' }}>
    <CardContent sx={{ py: 1.8 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, subtitle, children }) => (
  <Card
    sx={{
      height: '100%',
      border: 1,
      borderColor: 'divider',
      bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
    }}
  >
    <CardContent>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      <Box sx={{ mt: 1.5 }}>{children}</Box>
    </CardContent>
  </Card>
);

export default function AnalyticsDashboard({ snackbar }) {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [useMockData, setUseMockData] = useState(false);

  const [filters, setFilters] = useState({
    route: ANALYTICS_ALL_OPTION,
    statusCategory: ANALYTICS_ALL_OPTION,
    deviceType: ANALYTICS_ALL_OPTION,
  });

  const fetchAnalyticsEvents = async (selectedDays) => {
    let page = 1;
    let totalPages = 1;
    let collected = [];

    while (page <= totalPages && collected.length < MAX_FETCH_EVENTS) {
      const response = await fetchWithAuth(
        `${API_URL}/auth/admin/analytics/events?days=${selectedDays}&page=${page}&limit=${PAGE_LIMIT}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics events');
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      collected = collected.concat(items);

      totalPages = Number(payload?.pagination?.totalPages || 1);
      page += 1;
    }

    return collected.slice(0, MAX_FETCH_EVENTS);
  };

  const loadData = async ({ selectedDays = days, forceMock = false } = {}) => {
    setLoading(true);
    setError('');

    try {
      const result = forceMock
        ? generateMockAnalyticsData({ rows: 900, days: selectedDays })
        : await fetchAnalyticsEvents(selectedDays);

      setEvents(result);
      setUseMockData(forceMock);
      setFilters({
        route: ANALYTICS_ALL_OPTION,
        statusCategory: ANALYTICS_ALL_OPTION,
        deviceType: ANALYTICS_ALL_OPTION,
      });

      snackbar(`Loaded ${result.length} analytics events`, 'success');
    } catch (loadError) {
      const message = loadError?.message || 'Failed to load analytics data';
      setError(message);
      snackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ selectedDays: days });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const filteredEvents = useMemo(() => applyAnalyticsFilters(events, filters), [events, filters]);

  const options = useMemo(() => buildFilterOptions(events), [events]);
  const heatmapData = useMemo(() => buildHeatmapMatrix(filteredEvents, { bucketMinutes: 15, maxRoutes: 12 }), [filteredEvents]);
  const latencyDistribution = useMemo(() => computeLatencyDistribution(filteredEvents, 10), [filteredEvents]);
  const sankeyData = useMemo(() => buildRequestFlowSankey(filteredEvents, 36), [filteredEvents]);
  const scatterData = useMemo(() => buildLatencyScatter(filteredEvents, 12), [filteredEvents]);
  const deviceData = useMemo(() => computeDeviceBreakdown(filteredEvents), [filteredEvents]);

  const stats = useMemo(() => {
    const totalRequests = filteredEvents.reduce((sum, item) => sum + (Number(item.occurrences) || 1), 0);
    const avgDuration = filteredEvents.length
      ? Math.round(filteredEvents.reduce((sum, item) => sum + (Number(item.durationMs) || 0), 0) / filteredEvents.length)
      : 0;
    const uniqueRoutes = new Set(filteredEvents.map((event) => String(event.routeGroup || event.path || 'unknown'))).size;
    const errorRequests = filteredEvents.reduce((sum, item) => {
      const code = Number(item.statusCode);
      if (code >= 400) return sum + (Number(item.occurrences) || 1);
      return sum;
    }, 0);

    return { totalRequests, avgDuration, uniqueRoutes, errorRequests };
  }, [filteredEvents]);

  return (
    <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.55), borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Request Telemetry Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Observability view for MongoDB `AnalyticsEvent` telemetry {useMockData ? '(mock data)' : '(live data)'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => loadData({ selectedDays: days, forceMock: true })} disabled={loading}>Use Mock Data</Button>
          <Button variant="contained" onClick={() => loadData({ selectedDays: days })} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select label="Time Range" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <MenuItem value={1}>Last 24 hours</MenuItem>
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Route</InputLabel>
              <Select
                label="Route"
                value={filters.route}
                onChange={(event) => setFilters((prev) => ({ ...prev, route: event.target.value }))}
              >
                {options.routes.map((route) => (
                  <MenuItem key={route} value={route}>{route}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Code</InputLabel>
              <Select
                label="Status Code"
                value={filters.statusCategory}
                onChange={(event) => setFilters((prev) => ({ ...prev, statusCategory: event.target.value }))}
              >
                {STATUS_CATEGORIES.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Device Type</InputLabel>
              <Select
                label="Device Type"
                value={filters.deviceType}
                onChange={(event) => setFilters((prev) => ({ ...prev, deviceType: event.target.value }))}
              >
                {options.deviceTypes.map((device) => (
                  <MenuItem key={device} value={device}>{device}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard label="Total Requests" value={stats.totalRequests} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard label="Avg Duration" value={`${stats.avgDuration} ms`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard label="Unique Routes" value={stats.uniqueRoutes} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard label="4xx/5xx Requests" value={stats.errorRequests} /></Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <ChartCard title="Route Traffic Heatmap" subtitle="X: bucketStart, Y: route, color intensity: occurrences">
              <RouteTrafficHeatmap matrix={heatmapData} />
            </ChartCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <ChartCard title="Route Performance Distribution" subtitle="Box-style latency spread by route">
              <RoutePerformanceDistribution data={latencyDistribution} />
            </ChartCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <ChartCard title="Request Flow Visualization" subtitle="Sankey: referrer → routeGroup → next route">
              <RequestFlowSankey data={sankeyData} />
            </ChartCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <ChartCard title="Latency Scatter Plot" subtitle="Point size by occurrences, color by status class">
              <LatencyScatterPlot data={scatterData} />
            </ChartCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <ChartCard title="Device Breakdown" subtitle="Nested device → OS → browser distribution">
              <DeviceBreakdownChart data={deviceData} />
            </ChartCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
