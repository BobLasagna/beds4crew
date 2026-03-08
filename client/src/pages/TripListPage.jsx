import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  ButtonGroup,
  FormControlLabel,
  Switch,
  TextField,
  List,
  ListItemText,
  Divider,
  Avatar,
  ListItemAvatar,
  Badge,
  Alert,
  ListItemButton,
  Paper,
  Stack,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { LoadingState, NoTrips } from "../components/EmptyState";
import { fetchWithAuth, API_URL } from "../utils/api";
import { formatImageUrl } from "../utils/helpers";
import { commonStyles } from "../utils/styleConstants";
import { isArchivedBookingStatus, sortBookingThreads } from "../utils/bookingThreads";
import { getBooleanCookie, setBooleanCookie } from "../utils/cookies";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const FILTER_COOKIE_KEYS = {
  showPending: "tripChatShowPending",
  showConfirmed: "tripChatShowConfirmed",
  showArchived: "tripChatShowArchived",
};

export default function TripListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [sortBy, setSortBy] = useState("newMessage");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showPending, setShowPending] = useState(() => getBooleanCookie(FILTER_COOKIE_KEYS.showPending, true));
  const [showConfirmed, setShowConfirmed] = useState(() => getBooleanCookie(FILTER_COOKIE_KEYS.showConfirmed, true));
  const [showArchived, setShowArchived] = useState(() => getBooleanCookie(FILTER_COOKIE_KEYS.showArchived, false));
  const [finalizeAnonymous, setFinalizeAnonymous] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const getFilteredBookings = () =>
    bookings.filter((booking) => {
      if (booking.status === "pending") return showPending;
      if (booking.status === "confirmed") return showConfirmed;
      if (isArchivedBookingStatus(booking)) return showArchived;
      return true;
    });

  const getSortedBookings = (list) => {
    return sortBookingThreads(list, { sortBy, sortDirection, unreadKey: "unreadByGuest" });
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

  useEffect(() => {
    setBooleanCookie(FILTER_COOKIE_KEYS.showPending, showPending);
    setBooleanCookie(FILTER_COOKIE_KEYS.showConfirmed, showConfirmed);
    setBooleanCookie(FILTER_COOKIE_KEYS.showArchived, showArchived);
  }, [showPending, showConfirmed, showArchived]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/guest`);
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

    // Mark as read by guest
    if (booking.unreadByGuest) {
      await fetchWithAuth(`${API_URL}/bookings/${bookingId}/mark-read`, {
        method: "PUT"
      });

      setBookings((prev) =>
        prev.map((bk) => (bk._id === bookingId ? { ...bk, unreadByGuest: false } : bk))
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

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${bookingId}/cancel`, {
      method: "PUT"
    });
    
    await loadBookings();
  };

  const handleStartReview = async (bookingId) => {
    if (!bookingId) return;

    const confirmed = window.confirm(
      "Submit a review for this reservation? Messaging will stay open until your review is submitted."
    );
    if (!confirmed) return;

    setIsFinalizing(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}/review/start`, {
        method: "PUT",
        body: JSON.stringify({ anonymous: finalizeAnonymous }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.message || "Failed to start review");
        return;
      }

      await loadBookings();
      await loadBookingDetails(bookingId);

      if (data?.reviewUrl) {
        navigate(data.reviewUrl);
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "warning";
      case "confirmed": return "success";
      case "cancelled": return "error";
      case "rejected": return "error";
      case "archived": return "info";
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

  const archivedBookings = bookings.filter((bk) => isArchivedBookingStatus(bk));
  const orderedThreads = getSortedBookings(getFilteredBookings());
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const showListPane = !isMobile || !showMobileConversation;
  const showConversationPane = !isMobile || showMobileConversation;
  const isMessagingDisabled = Boolean(selectedBooking?.finalization?.messagingDisabled);

  if (loading) {
    return <LoadingState message="Loading your trips..." />;
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
          Your Trips
        </Typography>
        {archivedBookings.length > 0 && (
          <Chip label={`Archived ${archivedBookings.length}`} variant="outlined" />
        )}
      </Stack>

      {bookings.length === 0 && (
        <NoTrips />
      )}

      {bookings.length > 0 && (
        <Grid container spacing={2.5}>
          {showListPane && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ borderRadius: 2, overflow: "hidden", height: { xs: "calc(100vh - 220px)", md: "auto" } }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary">Sort by</Typography>
                <ButtonGroup size="small" variant="outlined" sx={{ mt: 0.75, display: "flex" }}>
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

              <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary">Filters</Typography>
                <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />}
                    label={<Typography variant="caption">Pending</Typography>}
                    sx={{ mr: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showConfirmed} onChange={(e) => setShowConfirmed(e.target.checked)} />}
                    label={<Typography variant="caption">Confirmed</Typography>}
                    sx={{ mr: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
                    label={<Typography variant="caption">Archived</Typography>}
                  />
                </Stack>
              </Box>

              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Conversations ({orderedThreads.length})
                </Typography>
              </Box>

              <List sx={{ height: { xs: "calc(100% - 185px)", md: 620 }, overflow: "auto", p: 0 }}>
                {orderedThreads.map((bk, index) => {
                  const isSelected = selectedBookingId === bk._id;
                  const isArchived = isArchivedBookingStatus(bk);
                  const threadDate = `${dayjs.utc(bk.startDate).format("M/D/YYYY")} – ${dayjs.utc(bk.endDate).format("M/D/YYYY")}`;
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
                          opacity: isArchived ? 0.7 : 1,
                          borderLeft: isSelected ? 3 : 3,
                          borderColor: isSelected ? "primary.main" : "transparent",
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            color="error"
                            badgeContent={bk.unreadByGuest ? 1 : 0}
                            overlap="circular"
                            invisible={!bk.unreadByGuest}
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
                            <Chip
                              label={bk.status.toUpperCase()}
                              color={getStatusColor(bk.status)}
                              size="small"
                            />
                          </Box>
                          <ListItemText
                            primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                            secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                            primary={threadDate}
                            secondary={
                              lastMessageText
                                ? `${bk.unreadByGuest ? "New: " : ""}${lastMessageText}`
                                : bk.unreadByGuest
                                  ? "New message"
                                  : `Total: $${bk.totalPrice}`
                            }
                            sx={{ m: 0 }}
                          />
                        </Box>
                      </ListItemButton>
                      {index < orderedThreads.length - 1 && <Divider component="li" />}
                    </Box>
                  );
                })}
                {orderedThreads.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">No trips match the current filters.</Typography>
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
                  <Typography color="text.secondary">Select a trip conversation to view details.</Typography>
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
                        Back to conversations
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
                          Host: {selectedBooking.host?.firstName} {selectedBooking.host?.lastName}
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
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ mt: 1.5 }}
                        onClick={() => handleCancelBooking(selectedBooking._id)}
                      >
                        Cancel Booking
                      </Button>
                    )}

                    {selectedBooking.status === "confirmed" && !selectedBooking?.finalization?.guestReviewedAt && (
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        <Alert severity="warning">
                          Once you submit your review, messaging will be disabled.
                        </Alert>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                          <FormControlLabel
                            control={<Switch size="small" checked={finalizeAnonymous} onChange={(e) => setFinalizeAnonymous(e.target.checked)} />}
                            label={<Typography variant="caption">Anonymous review</Typography>}
                          />
                          <Button size="small" variant="outlined" disabled={isFinalizing} onClick={() => handleStartReview(selectedBooking._id)}>
                            Leave Review
                          </Button>
                          {isFinalizing && <CircularProgress size={18} />}
                        </Stack>
                      </Stack>
                    )}

                    {selectedBooking?.finalization?.guestReviewedAt && (
                      <Alert severity="info" sx={{ mt: 1.5 }}>
                        Reservation archived after review. Messaging is disabled.
                      </Alert>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
                    <Stack spacing={1.25}>
                      {selectedBooking.messages && selectedBooking.messages.length > 0 ? (
                        selectedBooking.messages.map((msg, idx) => {
                          const isSystemMessage = msg.type === "system" || !msg.sender;
                          const isCurrentUser = msg.sender?._id === currentUser.id;
                          const profilePhotoUrl = msg.sender?.profileImagePath || "";

                          if (isSystemMessage) {
                            const systemBadgeColor = {
                              review_set: "secondary",
                              review_submitted: "success",
                              archive_set: "info",
                              cancel_set: "error",
                            };

                            return (
                              <Box key={idx} sx={{ display: "flex", justifyContent: "center" }}>
                                <Stack spacing={0.5} alignItems="center" sx={{ maxWidth: { xs: "96%", sm: "80%" } }}>
                                  <Chip
                                    size="small"
                                    color={systemBadgeColor[msg.action] || "default"}
                                    label={(msg.action || "system").replace(/_/g, " ").toUpperCase()}
                                  />
                                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                                    {msg.text}
                                  </Typography>
                                </Stack>
                              </Box>
                            );
                          }

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
                        <Typography variant="body2" color="text.secondary">
                          No messages yet.
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Divider />
                  {selectedBooking.status !== "rejected" && selectedBooking.status !== "cancelled" && selectedBooking.status !== "archived" && !isMessagingDisabled ? (
                    <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Type a message to the host..."
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
                      Messaging is disabled for this reservation.
                    </Alert>
                  )}
                </>
              )}
            </Paper>
          </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
