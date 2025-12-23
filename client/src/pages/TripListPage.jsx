import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Card, CardContent, CardMedia, Grid, Chip, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, 
  ListItem, ListItemText, Divider 
} from "@mui/material";
import { fetchWithAuth, API_URL, BASE_URL } from "../utils/api";

export default function TripListPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
`  const [messageText, setMessageText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = () => {
    fetchWithAuth(`${API_URL}/bookings/guest`)
      .then(res => res.json())
      .then(setBookings);
  };

  const handleOpenDialog = async (bookingId) => {
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
    const booking = await res.json();
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${selectedBooking._id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: messageText })
    });
    
    setMessageText("");
    // Reload the booking to get updated messages
    const res = await fetchWithAuth(`${API_URL}/bookings/${selectedBooking._id}`);
    const updated = await res.json();
    setSelectedBooking(updated);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${bookingId}/cancel`, {
      method: "PUT"
    });
    
    loadBookings();
    setDialogOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "warning";
      case "confirmed": return "success";
      case "cancelled": return "error";
      case "rejected": return "error";
      default: return "default";
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", mt: 4, px: 2 }}>
      <Typography variant="h4" mb={2}>My Trips</Typography>
      <Grid container spacing={2}>
        {bookings.map(bk => (
          <Grid item xs={12} sm={6} md={4} key={bk._id}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={`${BASE_URL}${bk.property.images?.[0]?.path || bk.property.images?.[0]}`}
                alt={bk.property.title}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>{bk.property.title}</Typography>
                <Typography variant="body2" color="text.secondary">{bk.property.address}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Total: ${bk.totalPrice}
                </Typography>
                <Chip 
                  label={bk.status.toUpperCase()} 
                  color={getStatusColor(bk.status)} 
                  size="small" 
                  sx={{ mt: 1 }}
                />
                {bk.bookedBeds && bk.bookedBeds.length > 0 && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Beds: {bk.bookedBeds.map(b => b.bedLabel).join(", ")}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => handleOpenDialog(bk._id)}
                  >
                    View Details & Message
                  </Button>
                  {(bk.status === "pending" || bk.status === "confirmed") && (
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleCancelBooking(bk._id)}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {!bookings.length && <Typography sx={{ mt: 7, color: "gray" }}>No trips/bookings found.</Typography>}

      {/* Booking Details & Messaging Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedBooking && (
          <>
            <DialogTitle>
              Booking Details
              <Chip 
                label={selectedBooking.status.toUpperCase()} 
                color={getStatusColor(selectedBooking.status)} 
                size="small" 
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                <strong>{selectedBooking.property.title}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedBooking.property.address}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Host: {selectedBooking.host?.firstName} {selectedBooking.host?.lastName}
              </Typography>
              <Typography variant="body2">
                Dates: {new Date(selectedBooking.startDate).toLocaleDateString()} – {new Date(selectedBooking.endDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                Total: ${selectedBooking.totalPrice}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Messages</Typography>
              
              {selectedBooking.messages && selectedBooking.messages.length > 0 ? (
                <List sx={{ maxHeight: 200, overflow: "auto", bgcolor: "background.paper" }}>
                  {selectedBooking.messages.map((msg, idx) => (
                    <ListItem key={idx} alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Typography variant="caption" color="text.secondary">
                            {msg.sender?.firstName || "User"} - {new Date(msg.timestamp).toLocaleString()}
                          </Typography>
                        }
                        secondary={msg.text}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No messages yet</Typography>
              )}

              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message to the host..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button variant="contained" onClick={handleSendMessage}>
                  Send
                </Button>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
