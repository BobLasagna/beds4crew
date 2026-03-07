import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shortLabel = (label, max = 14) => {
  const text = String(label || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

export default function Analytics3DViewer({ template }) {
  const theme = useTheme();

  const points = useMemo(() => {
    const source = Array.isArray(template?.points) ? template.points : [];
    return source
      .map((point, index) => ({
        id: point?.id || `point-${index + 1}`,
        label: String(point?.label || `Point ${index + 1}`),
        y: Math.max(safeNumber(point?.y, 0), 0),
        z: Math.max(safeNumber(point?.z, 0), 0),
      }))
      .slice(0, 24);
  }, [template]);

  const settings = template?.settings || {};
  const chartWidth = 1120;
  const chartHeight = 460;
  const margin = { top: 44, right: 42, bottom: 80, left: 58 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const baseY = margin.top + plotHeight;

  const gap = clamp(safeNumber(settings.barGap, 12), 6, 30);
  const depthScale = clamp(safeNumber(settings.depthScale, 1), 0.4, 2.6);
  const tiltX = clamp(safeNumber(settings.tiltX, 16), 8, 34);
  const tiltY = clamp(safeNumber(settings.tiltY, 12), 6, 24);
  const heightScale = clamp(safeNumber(settings.heightScale, 1), 0.35, 1.6);
  const showLabels = settings.showLabels !== false;

  const maxY = Math.max(...points.map((point) => point.y), 1);
  const maxZ = Math.max(...points.map((point) => point.z), 1);
  const slotWidth = points.length > 0 ? plotWidth / points.length : plotWidth;
  const barWidth = Math.max(slotWidth - gap, Math.min(74, slotWidth * 0.82));

  const bars = points.map((point, index) => {
    const height = (point.y / maxY) * plotHeight * heightScale;
    const depthBase = 10 + (point.z / maxZ) * 30 * depthScale;
    const depthX = depthBase * (tiltX / 20);
    const depthY = depthBase * (tiltY / 20);

    const x = margin.left + index * slotWidth + (slotWidth - barWidth) / 2;
    const y = baseY - height;

    const frontColor = alpha(theme.palette.primary.main, 0.72);
    const topColor = alpha(theme.palette.primary.light || theme.palette.primary.main, 0.58);
    const sideColor = alpha(theme.palette.primary.dark || theme.palette.primary.main, 0.5);

    return {
      point,
      x,
      y,
      height,
      depthX,
      depthY,
      frontColor,
      topColor,
      sideColor,
    };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((value) => {
    const y = margin.top + plotHeight - plotHeight * value;
    const metric = Math.round(maxY * value);
    return { y, metric };
  });

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.7),
          overflowX: 'auto',
        }}
      >
        <svg width="100%" height="460" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="3D analytics chart">
          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="transparent" />

          {yTicks.map((tick) => (
            <g key={`y-${tick.metric}`}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={chartWidth - margin.right}
                y2={tick.y}
                stroke={alpha(theme.palette.divider, 0.85)}
                strokeWidth="1"
              />
              <text
                x={margin.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fill={theme.palette.text.secondary}
                fontSize="11"
              >
                {tick.metric}
              </text>
            </g>
          ))}

          {bars.map((bar) => (
            <g key={bar.point.id}>
              <polygon
                points={`${bar.x},${bar.y} ${bar.x + bar.depthX},${bar.y - bar.depthY} ${bar.x + barWidth + bar.depthX},${bar.y - bar.depthY} ${bar.x + barWidth},${bar.y}`}
                fill={bar.topColor}
              />

              <polygon
                points={`${bar.x + barWidth},${bar.y} ${bar.x + barWidth + bar.depthX},${bar.y - bar.depthY} ${bar.x + barWidth + bar.depthX},${baseY - bar.depthY} ${bar.x + barWidth},${baseY}`}
                fill={bar.sideColor}
              />

              <rect x={bar.x} y={bar.y} width={barWidth} height={Math.max(bar.height, 1)} fill={bar.frontColor} />

              <title>{`${bar.point.label}: y=${bar.point.y}, z=${bar.point.z}`}</title>
            </g>
          ))}

          <line
            x1={margin.left}
            y1={baseY}
            x2={chartWidth - margin.right}
            y2={baseY}
            stroke={theme.palette.text.primary}
            strokeWidth="1.2"
          />

          {showLabels && bars.map((bar) => (
            <text
              key={`label-${bar.point.id}`}
              x={bar.x + barWidth / 2}
              y={baseY + 18}
              textAnchor="middle"
              fill={theme.palette.text.secondary}
              fontSize="10"
            >
              {shortLabel(bar.point.label)}
            </text>
          ))}
        </svg>
      </Box>

      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          X: {template?.axes?.x || 'Category'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Y: {template?.axes?.y || 'Primary Metric'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Z: {template?.axes?.z || 'Depth Metric'}
        </Typography>
      </Box>
    </Box>
  );
}
