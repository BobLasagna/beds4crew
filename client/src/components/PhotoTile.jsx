import React, { useState, useCallback } from "react";
import {
  Box,
  Card,
  CardMedia,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

export default function PhotoTile({
  imageUrl,
  caption = "",
  onCaptionChange,
  onImageDelete,
  isOwner = false,
  index = 0,
  captionLoading = false,
  deleteLoading = false,
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tempCaption, setTempCaption] = useState(caption);
  const [isHovering, setIsHovering] = useState(false);

  const handleEditClick = useCallback(() => {
    setTempCaption(caption);
    setEditDialogOpen(true);
  }, [caption]);

  const handleSaveCaption = useCallback(() => {
    onCaptionChange(index, tempCaption);
    setEditDialogOpen(false);
  }, [onCaptionChange, index, tempCaption]);

  const handleDeleteImage = useCallback(() => {
    if (window.confirm("Are you sure you want to delete this image?")) {
      onImageDelete(index);
    }
  }, [onImageDelete, index]);

  const handleDialogClose = useCallback(() => {
    if (!captionLoading) {
      setEditDialogOpen(false);
    }
  }, [captionLoading]);

  return (
    <>
      <Card
        sx={{
          position: "relative",
          height: 280,
          overflow: "hidden",
          borderRadius: 1,
          transition: "box-shadow 0.3s ease",
          "&:hover": isOwner ? { boxShadow: 4 } : {},
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <CardMedia
          component="img"
          height="280"
          image={imageUrl}
          alt={caption || `Photo ${index + 1}`}
          sx={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
        />

        {/* Caption Overlay - Bottom Left (Always visible for guests) */}
        {caption && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              p: 1.5,
              fontSize: "0.875rem",
              lineHeight: 1.4,
              backdropFilter: "blur(2px)",
            }}
          >
            <Typography variant="body2" sx={{ color: "white" }}>
              {caption}
            </Typography>
          </Box>
        )}

        {/* Owner Controls - Top Right (visible on hover for owners) */}
        {isOwner && isHovering && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 0.5,
              bgcolor: "rgba(255, 255, 255, 0.95)",
              borderRadius: 1,
              p: 0.5,
            }}
          >
            <IconButton
              size="small"
              onClick={handleEditClick}
              title="Edit caption"
              disabled={captionLoading || deleteLoading}
              sx={{
                color: "#1976d2",
                "&:hover": { bgcolor: "rgba(25, 118, 210, 0.1)" },
              }}
            >
              {captionLoading ? (
                <CircularProgress size={20} />
              ) : (
                <EditIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDeleteImage}
              title="Delete image"
              disabled={captionLoading || deleteLoading}
              sx={{
                color: "#d32f2f",
                "&:hover": { bgcolor: "rgba(211, 47, 47, 0.1)" },
              }}
            >
              {deleteLoading ? (
                <CircularProgress size={20} />
              ) : (
                <DeleteIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
        )}

        {/* Empty State Indicator for Owners */}
        {isOwner && !caption && isHovering && !captionLoading && !deleteLoading && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              p: 1.5,
              fontSize: "0.75rem",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Click edit to add a caption
            </Typography>
          </Box>
        )}
      </Card>

      {/* Caption Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={captionLoading}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Edit Photo Caption</span>
            <IconButton
              onClick={handleDialogClose}
              size="small"
              disabled={captionLoading}
              sx={{ color: "text.secondary" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="Add a description for this photo (optional)"
            value={tempCaption}
            onChange={(e) => setTempCaption(e.target.value)}
            variant="outlined"
            helperText="Help guests understand what's in this photo (max 500 characters)"
            disabled={captionLoading}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDialogClose}
            disabled={captionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveCaption}
            variant="contained"
            color="primary"
            disabled={captionLoading}
          >
            {captionLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              "Save Caption"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
