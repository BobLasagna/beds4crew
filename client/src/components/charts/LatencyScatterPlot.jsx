import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

const STATUS_COLORS = {
  '2xx': '#22c55e',
  '3xx': '#38bdf8',
  '4xx': '#f59e0b',
  '5xx': '#ef4444',
  other: '#a855f7',
};

export default function LatencyScatterPlot({ data }) {
  const routes = data?.routes || [];
  const grouped = data?.grouped || {};
  const totalPoints = Object.values(grouped).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  if (!totalPoints) {
    return <Typography variant="body2" color="text.secondary">No latency scatter points available.</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 340 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 20, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="routeIndex"
            domain={[0, Math.max(routes.length - 1, 0)]}
            tickFormatter={(index) => routes[index] || ''}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis type="number" dataKey="durationMs" name="Duration" unit=" ms" />
          <ZAxis type="number" dataKey="occurrences" range={[40, 420]} name="Occurrences" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, key) => {
              if (key === 'durationMs') return [`${value} ms`, 'Duration'];
              if (key === 'occurrences') return [value, 'Occurrences'];
              return [value, key];
            }}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload;
              return point ? `Route: ${point.route}` : '';
            }}
          />
          <Legend />

          {Object.entries(grouped).map(([statusCategory, points]) => (
            <Scatter
              key={statusCategory}
              name={statusCategory}
              data={points}
              fill={STATUS_COLORS[statusCategory] || STATUS_COLORS.other}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}
