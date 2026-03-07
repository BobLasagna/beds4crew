import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const shortRoute = (route) => (route.length > 16 ? `${route.slice(0, 15)}…` : route);

export default function RoutePerformanceDistribution({ data }) {
  const chartData = useMemo(() => (Array.isArray(data) ? data : []).map((item) => ({
    ...item,
    lowBand: Math.max((item.q1 || 0) - (item.min || 0), 0),
    iqrBand: Math.max((item.q3 || 0) - (item.q1 || 0), 0),
    highBand: Math.max((item.max || 0) - (item.q3 || 0), 0),
  })), [data]);

  if (!chartData.length) {
    return <Typography variant="body2" color="text.secondary">No latency distribution available.</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="route" tickFormatter={shortRoute} />
          <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'median') return [`${value} ms`, 'Median'];
              return [`${value} ms`, name];
            }}
            labelFormatter={(route) => `Route: ${route}`}
          />

          <Bar dataKey="min" stackId="dist" fill="transparent" />
          <Bar dataKey="lowBand" stackId="dist" fill="rgba(148,163,184,0.35)" />
          <Bar dataKey="iqrBand" stackId="dist" fill="rgba(59,130,246,0.55)" />
          <Bar dataKey="highBand" stackId="dist" fill="rgba(148,163,184,0.35)" />
          <Line dataKey="median" stroke="#f97316" strokeWidth={2.2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
