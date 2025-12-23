import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import dayjs from "dayjs";

export default function BlockPeriodManager({ property, onBlockAdded, onBlockRemoved }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs().add(1, "day"));
  const [reason, setReason] = useState("Unavailable");
  const [blockType, setBlockType] = useState("entire");
  const [roomIndex, setRoomIndex] = useState(0);
  const [bedIndex, setBedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setError("");
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError("");
  };

  const handleAddBlock = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (startDate.isAfter(endDate) || startDate.isSame(endDate)) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    setError("");

    const blockData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: reason || "Unavailable",
      blockType,
    };

    if (blockType === "room" || blockType === "bed") {
      blockData.roomIndex = roomIndex;
    }

    if (blockType === "bed") {
      blockData.bedIndex = bedIndex;
    }

    try {
      await onBlockAdded(blockData);
      handleCloseDialog();
      // Reset form
      setStartDate(dayjs());
      setEndDate(dayjs().add(1, "day"));
      setReason("Unavailable");
      setBlockType("entire");
      setRoomIndex(0);
      setBedIndex(0);
    } catch (err) {
      setError(err.message || "Failed to add block");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBlock = async (blockId) => {
    if (!window.confirm("Remove this blocked period?")) return;
    try {
      await onBlockRemoved(blockId);
    } catch (err) {
      console.error("Failed to remove block:", err);
    }
  };

  const getBlockLabel = (block) => {
    if (block.blockType === "entire") {
      return "Entire Property";
    } else if (block.blockType === "room") {
      return `Room #${block.roomIndex + 1}`;
    } else if (block.blockType === "bed") {
      const room = property.rooms[block.roomIndex];
      const bed = room?.beds[block.bedIndex];
      return `Room #${block.roomIndex + 1}, Bed: ${bed?.label || "N/A"}`;
    }
    return "Unknown";
  };

  const blockedPeriods = property.blockedPeriods || [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Blocked Periods</Typography>
        <Button
          variant="contained"
          startIcon={<BlockIcon />}
          onClick={handleOpenDialog}
        >
          Block Dates
        </Button>
      </Box>

      {blockedPeriods.length === 0 ? (
        <Alert severity="info">No blocked periods. Click "Block Dates" to make your property unavailable for specific dates.</Alert>
      ) : (
        <List>
          {blockedPeriods.map((block) => (
            <ListItem
              key={block._id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleRemoveBlock(block._id)}
                >
                  <DeleteIcon />
                </IconButton>
              }
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="body1" fontWeight="bold">
                      {dayjs(block.startDate).format("MMM D, YYYY")} - {dayjs(block.endDate).format("MMM D, YYYY")}
                    </Typography>
                    <Chip label={getBlockLabel(block)} size="small" color="warning" />
                  </Box>
                }
                secondary={`Reason: ${block.reason}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Block Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Block Dates</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Make your property, room, or specific bed unavailable for a period of time.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(val) => setStartDate(val ? dayjs(val) : dayjs())}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(val) => setEndDate(val ? dayjs(val) : dayjs().add(1, "day"))}
            />

            <TextField
              select
              label="Block Type"
              value={blockType}
              onChange={(e) => {
                setBlockType(e.target.value);
                setRoomIndex(0);
                setBedIndex(0);
              }}
              fullWidth
            >
              <MenuItem value="entire">Entire Property</MenuItem>
              <MenuItem value="room">Specific Room</MenuItem>
              <MenuItem value="bed">Specific Bed</MenuItem>
            </TextField>

            {(blockType === "room" || blockType === "bed") && (
              <TextField
                select
                label="Select Room"
                value={roomIndex}
                onChange={(e) => {
                  setRoomIndex(parseInt(e.target.value));
                  setBedIndex(0);
                }}
                fullWidth
              >
                {property.rooms.map((room, idx) => (
                  <MenuItem key={idx} value={idx}>
                    Room #{idx + 1} ({room.isPrivate ? "Private" : "Shared"})
                  </MenuItem>
                ))}
              </TextField>
            )}

            {blockType === "bed" && property.rooms[roomIndex] && (
              <TextField
                select
                label="Select Bed"
                value={bedIndex}
                onChange={(e) => setBedIndex(parseInt(e.target.value))}
                fullWidth
              >
                {property.rooms[roomIndex].beds.map((bed, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {bed.label} - ${bed.pricePerBed}/night
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Reason (Optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Maintenance, Holiday, Personal"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleAddBlock}
            variant="contained"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Block"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
