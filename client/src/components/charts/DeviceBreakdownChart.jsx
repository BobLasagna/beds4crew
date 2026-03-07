import React from 'react';
import { Box, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const DEVICE_COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4'];
const OS_COLORS = ['#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#f97316', '#e11d48', '#6366f1'];
const BROWSER_COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#f43f5e', '#a855f7', '#64748b', '#0ea5e9'];

export default function DeviceBreakdownChart({ data }) {
  const deviceData = data?.deviceData || [];
  const osData = data?.osData || [];
  const browserData = data?.browserData || [];

  if (!deviceData.length) {
    return <Typography variant="body2" color="text.secondary">No device breakdown available.</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 340 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip formatter={(value) => [value, 'Requests']} />

          <Pie data={browserData} dataKey="value" nameKey="name" innerRadius={108} outerRadius={142} paddingAngle={1}>
            {browserData.map((item, index) => (
              <Cell key={`browser-${item.name}`} fill={BROWSER_COLORS[index % BROWSER_COLORS.length]} />
            ))}
          </Pie>

          <Pie data={osData} dataKey="value" nameKey="name" innerRadius={74} outerRadius={104} paddingAngle={1}>
            {osData.map((item, index) => (
              <Cell key={`os-${item.name}`} fill={OS_COLORS[index % OS_COLORS.length]} />
            ))}
          </Pie>

          <Pie
            data={deviceData}
            dataKey="value"
            nameKey="name"
            innerRadius={42}
            outerRadius={70}
            paddingAngle={1}
            label={({ name }) => name}
            labelLine={false}
          >
            {deviceData.map((item, index) => (
              <Cell key={`device-${item.name}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
