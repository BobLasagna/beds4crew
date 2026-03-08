import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const formatBucket = (bucket) => {
  try {
    return new Date(bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return bucket;
  }
};

const shortRoute = (route) => (route.length > 24 ? `${route.slice(0, 23)}…` : route);

export default function RouteTrafficHeatmap({ matrix }) {
  const theme = useTheme();

  if (!matrix?.rows?.length || !matrix?.buckets?.length) {
    return <Typography variant="body2" color="text.secondary">No data for heatmap.</Typography>;
  }

  const maxValue = Math.max(matrix.maxValue || 1, 1);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        sx={{
          minWidth: 680,
          display: 'grid',
          gridTemplateColumns: `180px repeat(${matrix.buckets.length}, minmax(20px, 1fr))`,
          alignItems: 'stretch',
          gap: 0.4,
        }}
      >
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Route</Typography>
        </Box>
        {matrix.buckets.map((bucket) => (
          <Box key={bucket} sx={{ display: 'flex', justifyContent: 'center', p: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{formatBucket(bucket)}</Typography>
          </Box>
        ))}

        {matrix.rows.map((row) => (
          <React.Fragment key={row.route}>
            <Box sx={{ p: 0.5, pr: 1 }}>
              <Typography variant="caption">{shortRoute(row.route)}</Typography>
            </Box>
            {row.values.map((value, index) => {
              const intensity = value <= 0 ? 0 : Math.min(value / maxValue, 1);
              const cellColor = intensity === 0
                ? alpha(theme.palette.divider, 0.12)
                : alpha(theme.palette.primary.main, 0.18 + intensity * 0.72);

              return (
                <Tooltip
                  key={`${row.route}-${matrix.buckets[index]}`}
                  title={`${row.route} @ ${formatBucket(matrix.buckets[index])}: ${value} req`}
                  arrow
                >
                  <Box
                    sx={{
                      height: 24,
                      borderRadius: 0.6,
                      bgcolor: cellColor,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.common.black, 0.08),
                      transition: 'transform 120ms ease',
                      '&:hover': { transform: 'scale(1.06)' },
                    }}
                  />
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
