import React from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

export default function RequestFlowSankey({ data }) {
  const hasData = Array.isArray(data?.nodes) && data.nodes.length > 0
    && Array.isArray(data?.links) && data.links.length > 0;

  if (!hasData) {
    return <Typography variant="body2" color="text.secondary">No request flow links available.</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 340 }}>
      <ResponsiveContainer>
        <Sankey
          data={data}
          nodePadding={18}
          nodeWidth={10}
          iterations={24}
          linkCurvature={0.5}
          margin={{ top: 12, right: 12, left: 12, bottom: 12 }}
        >
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </Box>
  );
}
