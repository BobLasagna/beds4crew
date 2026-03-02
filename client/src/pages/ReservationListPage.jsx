import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  TextField,
  List,
  ListItemText,
  Divider,
  Alert,
  Avatar,
  ListItemAvatar,
  Badge,
  ButtonGroup,
  FormControlLabel,
  ListItemButton,
  Paper,
  Stack,
  Switch,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { LoadingState, NoReservations } from "../components/EmptyState";
import { fetchWithAuth, API_URL } from "../utils/api";
import { formatImageUrl } from "../utils/helpers";
import { commonStyles } from "../utils/styleConstants";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export default function ReservationListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newMessage");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const isArchivedStatus = (status) => status === "cancelled" || status === "rejected";

  const getLastMessageTimestamp = (booking) => {
    const messageCount = booking.messages?.length || 0;
    if (messageCount > 0) {
      const timestamp = booking.messages[messageCount - 1]?.timestamp;
      if (timestamp) return new Date(timestamp).getTime();
    }
    return dayjs.utc(booking.startDate).valueOf();
  };

  const getFilteredBookings = () =>
    bookings.filter((booking) => {
      if (!booking.property) return false;
      if (booking.status === "pending") return showPending;
      if (booking.status === "confirmed") return showConfirmed;
      if (isArchivedStatus(booking.status)) return showArchived;
      return true;
    });

  const getSortedBookings = (list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      let compareA;
      let compareB;

      switch (sortBy) {
        case "property":
          compareA = (a.property?.title || "").toLowerCase();
          compareB = (b.property?.title || "").toLowerCase();
          break;
        case "date":
          compareA = dayjs.utc(a.startDate).valueOf();
          compareB = dayjs.utc(b.startDate).valueOf();
          break;
        case "newMessage":
        default:
          compareA = `${a.unreadByHost ? "0" : "1"}-${String(9999999999999 - getLastMessageTimestamp(a)).padStart(13, "0")}`;
          compareB = `${b.unreadByHost ? "0" : "1"}-${String(9999999999999 - getLastMessageTimestamp(b)).padStart(13, "0")}`;
          break;
      }

      if (compareA < compareB) return sortDirection === "asc" ? -1 : 1;
      if (compareA > compareB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const visibleBookings = getSortedBookings(getFilteredBookings());

    if (visibleBookings.length === 0) {
      setSelectedBookingId(null);
      setSelectedBooking(null);
      return;
    }

    const hasSelected = selectedBookingId && visibleBookings.some((bk) => bk._id === selectedBookingId);
    if (!hasSelected) {
      setSelectedBookingId(visibleBookings[0]._id);
    }
  }, [bookings, selectedBookingId, showPending, showConfirmed, showArchived, sortBy, sortDirection]);

  useEffect(() => {
    if (selectedBookingId) {
      loadBookingDetails(selectedBookingId);
    }
  }, [selectedBookingId]);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileConversation(false);
    }
  }, [isMobile]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/host`);
      const data = await res.json();
      setBookings(data);
    } finally {
      setLoading(false);
    }
  };

  const loadBookingDetails = async (bookingId) => {
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
    const booking = await res.json();
    setSelectedBooking(booking);
    
    // Mark as read by host
    if (booking.unreadByHost) {
      await fetchWithAuth(`${API_URL}/bookings/${bookingId}/mark-read`, {
        method: "PUT"
      });

      setBookings((prev) =>
        prev.map((bk) => (bk._id === bookingId ? { ...bk, unreadByHost: false } : bk))
      );
    }
  };

  const handleSelectBooking = (bookingId) => {
    if (bookingId !== selectedBookingId) {
      setMessageText("");
      setSelectedBookingId(bookingId);
    }

    if (isMobile) {
      setShowMobileConversation(true);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    if (!window.confirm("Confirm this booking? The bed(s) will be marked as unavailable.")) return;
    
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}/confirm`, {
      method: "PUT"
    });
    
    if (res.ok) {
      await loadBookings();
      setSelectedBookingId(bookingId);
    } else if (res.status === 409) {
      const error = await res.json();
      alert(error.message || "Cannot confirm: This booking conflicts with another reservation.");
      await loadBookings();
    } else {
      const error = await res.json();
      alert(error.message || "Failed to confirm booking");
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("Reject this booking request?")) return;
    
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}/reject`, {
      method: "PUT"
    });
    
    if (res.ok) {
      await loadBookings();
      setSelectedBookingId(bookingId);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedBookingId) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${selectedBookingId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: messageText })
    });
    
    setMessageText("");
    await loadBookingDetails(selectedBookingId);
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const navigate = useNavigate();

  const pendingBookings = bookings.filter((b) => b.status === "pending" && b.property);
  const orderedThreads = getSortedBookings(getFilteredBookings());

  const pendingCount = pendingBookings.length;
  const newPendingCount = pendingBookings.filter((bk) => bk.unreadByHost).length;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const showListPane = !isMobile || !showMobileConversation;
  const showConversationPane = !isMobile || showMobileConversation;

  if (loading) {
    return <LoadingState message="Loading reservations..." />;
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4" sx={commonStyles.pageTitle}>
          Reservations for My Properties
        </Typography>
      </Stack>

      {bookings.length === 0 && <NoReservations />}

      {bookings.length > 0 && (
        <>
          {showListPane && (
          <>
          <Box sx={{ mb: 2.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Sort by:</Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button onClick={() => handleSort("newMessage")} variant={sortBy === "newMessage" ? "contained" : "outlined"}>
                New {sortBy === "newMessage" && (sortDirection === "asc" ? "↑" : "↓")}
              </Button>
              <Button onClick={() => handleSort("date")} variant={sortBy === "date" ? "contained" : "outlined"}>
                Date {sortBy === "date" && (sortDirection === "asc" ? "↑" : "↓")}
              </Button>
              <Button onClick={() => handleSort("property")} variant={sortBy === "property" ? "contained" : "outlined"}>
                Property {sortBy === "property" && (sortDirection === "asc" ? "↑" : "↓")}
              </Button>
            </ButtonGroup>
          </Box>

          <Box sx={{ mb: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <FormControlLabel
              control={<Switch size="small" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />}
              label={<Typography variant="caption">Pending</Typography>}
            />
            <FormControlLabel
              control={<Switch size="small" checked={showConfirmed} onChange={(e) => setShowConfirmed(e.target.checked)} />}
              label={<Typography variant="caption">Confirmed</Typography>}
            />
            <FormControlLabel
              control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
              label={<Typography variant="caption">Archived</Typography>}
            />
          </Box>

          {pendingCount > 0 && (
            <Alert severity="warning" sx={{ mb: 2.5 }}>
              You have {pendingCount} pending reservation request{pendingCount > 1 ? "s" : ""}
              {newPendingCount > 0 ? ` (${newPendingCount} new)` : ""} awaiting your response.
            </Alert>
          )}
          </>
          )}

          <Grid container spacing={2.5}>
            {showListPane && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ borderRadius: 2, overflow: "hidden", height: { xs: "calc(100vh - 220px)", md: "auto" } }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Reservation Threads
                  </Typography>
                </Box>

                <List sx={{ height: { xs: "calc(100% - 56px)", md: 620 }, overflow: "auto", p: 0 }}>
                  {orderedThreads.map((bk, index) => {
                    const isSelected = selectedBookingId === bk._id;
                    const isPending = bk.status === "pending";
                    const isArchived = bk.status === "cancelled" || bk.status === "rejected";
                    const guestName = `${bk.guest?.firstName || ""} ${bk.guest?.lastName || ""}`.trim() || "Guest";
                    const photo = formatImageUrl(bk.property?.images?.[0]?.path || bk.property?.images?.[0] || "");
                    const lastMessageText = bk.messages?.length
                      ? bk.messages[bk.messages.length - 1]?.text
                      : "";

                    return (
                      <Box key={bk._id}>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => handleSelectBooking(bk._id)}
                          sx={{
                            alignItems: "flex-start",
                            py: 1,
                            borderLeft: isSelected ? 3 : 3,
                            borderColor: isSelected
                              ? "primary.main"
                              : isPending
                                ? "warning.main"
                                : "transparent",
                            bgcolor: isPending
                              ? (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 167, 38, 0.08)"
                                    : "rgba(255, 167, 38, 0.10)"
                              : "inherit",
                            opacity: isArchived ? 0.75 : 1,
                          }}
                        >
                          <ListItemAvatar>
                            <Badge
                              color={isPending ? "warning" : "error"}
                              badgeContent={bk.unreadByHost ? 1 : 0}
                              overlap="circular"
                              invisible={!bk.unreadByHost}
                            >
                              <Avatar src={photo} alt={bk.property?.title}>
                                {!photo && <PersonIcon />}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>

                          <Box sx={{ width: "100%", minWidth: 0 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                {bk.property?.title || "Property"}
                              </Typography>
                              <Chip label={bk.status.toUpperCase()} color={getStatusColor(bk.status)} size="small" />
                            </Box>

                            <ListItemText
                              primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                              secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                              primary={`Guest: ${guestName}`}
                              secondary={
                                lastMessageText
                                  ? `${bk.unreadByHost ? "New: " : ""}${lastMessageText}`
                                  : `${dayjs.utc(bk.startDate).format("M/D")} - ${dayjs.utc(bk.endDate).format("M/D")} · $${bk.totalPrice}`
                              }
                              sx={{ m: 0 }}
                            />

                            {isPending && (
                              <Chip
                                label={bk.unreadByHost ? "New pending request" : "Pending response"}
                                size="small"
                                color="warning"
                                variant={bk.unreadByHost ? "filled" : "outlined"}
                                sx={{ mt: 0.75, height: 20 }}
                              />
                            )}
                          </Box>
                        </ListItemButton>
                        {index < orderedThreads.length - 1 && <Divider component="li" />}
                      </Box>
                    );
                  })}
                  {orderedThreads.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">No reservations match the current filters.</Typography>
                    </Box>
                  )}
                </List>
              </Paper>
            </Grid>
            )}

            {showConversationPane && (
            <Grid item xs={12} md={8}>
              <Paper
                sx={{
                  borderRadius: 2,
                  minHeight: { xs: "calc(100vh - 220px)", md: 620 },
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {!selectedBooking ? (
                  <Box sx={{ flex: 1, display: "grid", placeItems: "center", px: 3 }}>
                    <Typography color="text.secondary">Select a reservation thread to view details.</Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
                      {isMobile && (
                        <Button
                          size="small"
                          startIcon={<ArrowBackIcon fontSize="small" />}
                          onClick={() => setShowMobileConversation(false)}
                          sx={{ mb: 1 }}
                        >
                          Back to reservations
                        </Button>
                      )}
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={1.25}
                      >
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                            onClick={() => navigate(`/property/${selectedBooking.property?._id}`)}
                          >
                            {selectedBooking.property?.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedBooking.property?.address}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Guest: {selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName} · {selectedBooking.guest?.email}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={selectedBooking.status.toUpperCase()}
                            color={getStatusColor(selectedBooking.status)}
                            size="small"
                          />
                          <Chip
                            label={`${dayjs.utc(selectedBooking.startDate).format("M/D/YYYY")} – ${dayjs.utc(selectedBooking.endDate).format("M/D/YYYY")}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip label={`Total $${selectedBooking.totalPrice}`} size="small" variant="outlined" />
                        </Stack>
                      </Stack>

                      {selectedBooking.status === "pending" && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleConfirmBooking(selectedBooking._id)}
                          >
                            Confirm Booking
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleRejectBooking(selectedBooking._id)}
                          >
                            Reject Request
                          </Button>
                        </Stack>
                      )}
                    </Box>

                    <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
                      <Stack spacing={1.25}>
                        {selectedBooking.messages && selectedBooking.messages.length > 0 ? (
                          selectedBooking.messages.map((msg, idx) => {
                            const isCurrentUser = msg.sender?._id === currentUser.id;
                            const profilePhotoUrl = msg.sender?.profileImagePath || "";

                            return (
                              <Box
                                key={idx}
                                sx={{
                                  display: "flex",
                                  justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                                }}
                              >
                                <Box
                                  sx={{
                                    maxWidth: { xs: "92%", sm: "78%" },
                                    bgcolor: isCurrentUser
                                      ? (theme) =>
                                          theme.palette.mode === "dark" ? "grey.800" : "grey.300"
                                      : (theme) =>
                                          theme.palette.mode === "dark" ? "grey.900" : "grey.200",
                                    borderRadius: 2,
                                    px: 1.5,
                                    py: 1,
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4 }}>
                                    <Avatar src={profilePhotoUrl} sx={{ width: 24, height: 24 }}>
                                      {!profilePhotoUrl && <PersonIcon sx={{ fontSize: 16 }} />}
                                    </Avatar>
                                    <Typography variant="caption" color="text.secondary">
                                      {msg.sender?.firstName || "User"} · {new Date(msg.timestamp).toLocaleString()}
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2">{msg.text}</Typography>
                                </Box>
                              </Box>
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary">No messages yet.</Typography>
                        )}
                      </Stack>
                    </Box>

                    <Divider />
                    {selectedBooking.status !== "rejected" && selectedBooking.status !== "cancelled" ? (
                      <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Type a message to the guest..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          multiline
                          maxRows={3}
                          onKeyDown={handleComposerKeyDown}
                        />
                        <Button variant="contained" onClick={handleSendMessage} disabled={!messageText.trim()}>
                          Send
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ m: 1.5 }}>
                        Messaging is disabled for {selectedBooking.status} bookings.
                      </Alert>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
}
