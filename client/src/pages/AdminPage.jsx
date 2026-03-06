import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Chip,
  TablePagination,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_URL } from '../utils/api';
import { useSnackbar } from '../components/AppSnackbar';
import { commonStyles } from '../utils/styleConstants';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export default function AdminPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({});

  // Listings state
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsRowsPerPage, setListingsRowsPerPage] = useState(10);
  const [editListingOpen, setEditListingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingFormData, setListingFormData] = useState({});

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(0);
  const [bookingsRowsPerPage, setBookingsRowsPerPage] = useState(10);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Support tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsPage, setTicketsPage] = useState(0);
  const [ticketsRowsPerPage, setTicketsRowsPerPage] = useState(10);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  // Check authorization and fetch data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const meResponse = await fetchWithAuth(`${API_URL}/auth/me`);
        if (!meResponse.ok) {
          throw new Error('Unable to verify admin session');
        }
        const meData = await meResponse.json();
        const user = {
          ...(JSON.parse(localStorage.getItem('user') || '{}')),
          ...(meData || {}),
          id: meData?._id || meData?.id,
          isAdmin: !!meData?.isAdmin,
        };
        localStorage.setItem('user', JSON.stringify(user));

        if (user.isAdmin) {
          setAuthorized(true);
          fetchUsers();
          fetchListings();
          fetchBookings();
          fetchTickets(1, ticketsRowsPerPage);
        } else {
          setAuthorized(false);
          snackbar('Unauthorized: Admin access denied', 'error');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        snackbar('Authorization failed', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, snackbar]);

  useEffect(() => {
    setUsersPage(0);
  }, [users.length]);

  useEffect(() => {
    setListingsPage(0);
  }, [listings.length]);

  useEffect(() => {
    setBookingsPage(0);
  }, [bookings.length]);

  const paginatedUsers = users.slice(
    usersPage * usersRowsPerPage,
    usersPage * usersRowsPerPage + usersRowsPerPage
  );

  const paginatedListings = listings.slice(
    listingsPage * listingsRowsPerPage,
    listingsPage * listingsRowsPerPage + listingsRowsPerPage
  );

  const paginatedBookings = bookings.slice(
    bookingsPage * bookingsRowsPerPage,
    bookingsPage * bookingsRowsPerPage + bookingsRowsPerPage
  );

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      snackbar('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchListings = async () => {
    setListingsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
      snackbar('Failed to load listings', 'error');
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/bookings`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      snackbar('Failed to load bookings', 'error');
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchTickets = async (page = ticketsPage + 1, limit = ticketsRowsPerPage) => {
    setTicketsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/tickets?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(Array.isArray(data.items) ? data.items : []);
      setTicketsTotal(data?.pagination?.total || 0);
      setTicketsPage(Math.max((data?.pagination?.page || page) - 1, 0));
      setTicketsRowsPerPage(data?.pagination?.limit || limit);
      setSelectedTicketIds([]);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      snackbar('Failed to load support tickets', 'error');
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleToggleTicket = (ticketId) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleToggleAllTickets = () => {
    if (tickets.length === 0) return;
    const visibleIds = tickets.map((ticket) => ticket._id);
    const allSelected = visibleIds.every((id) => selectedTicketIds.includes(id));
    setSelectedTicketIds(allSelected ? [] : visibleIds);
  };

  const handleBulkDeleteTickets = async () => {
    if (selectedTicketIds.length === 0) {
      snackbar('Select at least one ticket to delete', 'warning');
      return;
    }

    if (!window.confirm(`Delete ${selectedTicketIds.length} selected ticket(s)?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/tickets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTicketIds }),
      });
      if (!res.ok) throw new Error('Failed to delete tickets');
      const data = await res.json();
      snackbar(`Deleted ${data.deletedCount || selectedTicketIds.length} ticket(s)`, 'success');

      const remainingOnPage = Math.max(tickets.length - selectedTicketIds.length, 0);
      const nextPage = remainingOnPage === 0 && ticketsPage > 0 ? ticketsPage : ticketsPage + 1;
      fetchTickets(nextPage, ticketsRowsPerPage);
    } catch (err) {
      console.error('Error deleting tickets:', err);
      snackbar('Failed to delete tickets', 'error');
    }
  };

  // User edit handlers
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'guest',
      isActive: user.isActive !== false,
      hasPaid: user.hasPaid || false,
      stripeCurrentTier: user.stripeCurrentTier || 0,
      listingLimit: user.listingLimit || 0,
      subscriptionStatus: user.subscriptionStatus || '',
      stripeSubscriptionId: user.stripeSubscriptionId || ''
    });
    setEditUserOpen(true);
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/properties/admin/clear-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error("Failed to clear cache");
      }
      
      const data = await res.json();
      snackbar(data.message, "success");
    } catch (error) {
      snackbar(error.message || "Failed to clear cache", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });
      if (!res.ok) throw new Error('Failed to update user');
      snackbar('User updated successfully', 'success');
      setEditUserOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      snackbar('Failed to save user', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete user');
      snackbar('User deleted successfully', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      snackbar('Failed to delete user', 'error');
    }
  };

  // Listing edit handlers
  const handleEditListing = (listing) => {
    setSelectedListing(listing);
    setListingFormData({
      title: listing.title || '',
      description: listing.description || '',
      pricePerNight: listing.pricePerNight || 0,
      maxGuests: listing.maxGuests || 0,
      category: listing.category || '',
      status: listing.status || 'inactive',
    });
    setEditListingOpen(true);
  };

  const handleSaveListing = async () => {
    console.log(listingFormData)
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties/${selectedListing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingFormData),
      });
      if (!res.ok) throw new Error('Failed to update listing');
      snackbar('Listing updated successfully', 'success');
      setEditListingOpen(false);
      fetchListings();
    } catch (err) {
      console.error('Error saving listing:', err);
      snackbar('Failed to save listing', 'error');
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties/${listingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete listing');
      snackbar('Listing deleted successfully', 'success');
      fetchListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      snackbar('Failed to delete listing', 'error');
    }
  };

  // Booking handlers
  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setBookingStatus(booking.status || 'pending');
    setEditBookingOpen(true);
  };

  const handleSaveBooking = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/bookings/${selectedBooking._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: bookingStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      snackbar('Booking updated successfully', 'success');
      setEditBookingOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Error saving booking:', err);
      snackbar('Failed to save booking', 'error');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete booking');
      snackbar('Booking deleted successfully', 'success');
      fetchBookings();
    } catch (err) {
      console.error('Error deleting booking:', err);
      snackbar('Failed to delete booking', 'error');
    }
  };

  const handleFixBeds = async () => {
    if (!window.confirm('This will fix all beds with missing isAvailable property. Continue?')) return;
    setMigrationLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/fix-beds`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to fix beds');
      const data = await res.json();
      snackbar(`Success! Updated ${data.propertiesUpdated} properties`, 'success');
      fetchListings(); // Refresh listings
    } catch (err) {
      console.error('Error fixing beds:', err);
      snackbar('Failed to fix beds', 'error');
    } finally {
      setMigrationLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authorized) {
    return (
      <Box sx={commonStyles.contentContainer}>
        <Alert severity="error">
          <Typography variant="body1">Unauthorized: Admin access denied</Typography>
          <Typography variant="body2">You are being redirected...</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage users and listings
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Users" />
          <Tab label="Listings" />
          <Tab label="Bookings" />
          <Tab label="Support Tickets" />
        </Tabs>

        {/* Maintenance Actions */}
        <Box sx={{ display: 'flex', flexDirection: "column", bgcolor: 'warning.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            🔧 Maintenance Actions
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={handleFixBeds}
            disabled={migrationLoading}
            size="small"
          >
            {migrationLoading ? <CircularProgress size={20} /> : 'Fix All Bed Availability'}
          </Button>
           <Button
                variant="outlined"
                color="error"
                size="large"
                onClick={handleClearCache}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                Clear Server Cache
              </Button>
            </Box>
        </Box>

        {/* Users Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">All Users ({users.length})</Typography>
              <Button variant="outlined" onClick={fetchUsers} disabled={usersLoading}>
                {usersLoading ? <CircularProgress size={24} /> : 'Refresh'}
              </Button>
            </Box>

            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : users.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Role</strong></TableCell>
                        <TableCell><strong>Tier</strong></TableCell>
                        <TableCell><strong>Subscription</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.map(user => {
                        const isAccountActive = user.isActive !== false;
                        
                        let displayLabel = isAccountActive ? 'Active' : 'Inactive';
                        let displayColor = isAccountActive ? 'success' : 'error';
                        
                        return (
                          <TableRow key={user._id}>
                            <TableCell>{user.firstName} {user.lastName}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip label={user.role} color={user.role === 'host' ? 'primary' : 'default'} size="small" />
                            </TableCell>
                            <TableCell>
                              {user.stripeCurrentTier ? (
                                <Chip 
                                  label={`Tier ${user.stripeCurrentTier} (${user.listingLimit} listings)`}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              ) : (
                                <Typography variant="caption" color="text.secondary">Free</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={displayLabel} color={displayColor} size="small" />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleEditUser(user)} color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteUser(user._id)} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={users.length}
                  page={usersPage}
                  onPageChange={(_, nextPage) => setUsersPage(nextPage)}
                  rowsPerPage={usersRowsPerPage}
                  onRowsPerPageChange={(event) => {
                    const nextRows = parseInt(event.target.value, 10);
                    setUsersRowsPerPage(nextRows);
                    setUsersPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No users found
              </Typography>
            )}
          </Box>
        )}

        {/* Listings Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">All Listings ({listings.length})</Typography>
              <Button variant="outlined" onClick={fetchListings} disabled={listingsLoading}>
                {listingsLoading ? <CircularProgress size={24} /> : 'Refresh'}
              </Button>
            </Box>

            {listingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : listings.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Host</strong></TableCell>
                        <TableCell><strong>Price/Night</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedListings.map(listing => (
                        <TableRow key={listing._id}>
                          <TableCell>{listing.title}</TableCell>
                          <TableCell>{listing.ownerHost?.firstName} {listing.ownerHost?.lastName}</TableCell>
                          <TableCell>${listing.pricePerNight}</TableCell>
                          <TableCell>{listing.category}</TableCell>
                          <TableCell>
                            <Chip 
                              label={listing.status} 
                              color={listing.status == 'active' ? 'success' : 'default'} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleEditListing(listing)} color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteListing(listing._id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={listings.length}
                  page={listingsPage}
                  onPageChange={(_, nextPage) => setListingsPage(nextPage)}
                  rowsPerPage={listingsRowsPerPage}
                  onRowsPerPageChange={(event) => {
                    const nextRows = parseInt(event.target.value, 10);
                    setListingsRowsPerPage(nextRows);
                    setListingsPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No listings found
              </Typography>
            )}
          </Box>
        )}

        {/* Bookings Tab */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">All Bookings ({bookings.length})</Typography>
              <Button variant="outlined" onClick={fetchBookings} disabled={bookingsLoading}>
                {bookingsLoading ? <CircularProgress size={24} /> : 'Refresh'}
              </Button>
            </Box>

            {bookingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : bookings.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Property</strong></TableCell>
                        <TableCell><strong>Guest</strong></TableCell>
                        <TableCell><strong>Host</strong></TableCell>
                        <TableCell><strong>Dates</strong></TableCell>
                        <TableCell><strong>Total</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedBookings.map(booking => (
                        <TableRow key={booking._id}>
                          <TableCell>
                            {booking.property?.title || 'Unknown'}
                            <Typography variant="caption" display="block" color="text.secondary">
                              {booking.property?.city}, {booking.property?.country}
                            </Typography>
                          </TableCell>
                          <TableCell>{booking.guest?.firstName} {booking.guest?.lastName}</TableCell>
                          <TableCell>{booking.host?.firstName} {booking.host?.lastName}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {dayjs.utc(booking.startDate).format("M/D/YYYY")} – {dayjs.utc(booking.endDate).format("M/D/YYYY")}
                            </Typography>
                          </TableCell>
                          <TableCell>${booking.totalPrice}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.status} 
                              color={
                                booking.status === 'confirmed' ? 'success' : 
                                booking.status === 'pending' ? 'warning' : 
                                booking.status === 'cancelled' || booking.status === 'rejected' ? 'error' : 'default'
                              } 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleEditBooking(booking)} color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteBooking(booking._id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={bookings.length}
                  page={bookingsPage}
                  onPageChange={(_, nextPage) => setBookingsPage(nextPage)}
                  rowsPerPage={bookingsRowsPerPage}
                  onRowsPerPageChange={(event) => {
                    const nextRows = parseInt(event.target.value, 10);
                    setBookingsRowsPerPage(nextRows);
                    setBookingsPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No bookings found
              </Typography>
            )}
          </Box>
        )}

        {/* Support Tickets Tab */}
        {tabValue === 3 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6">Support Tickets ({ticketsTotal})</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => fetchTickets(ticketsPage + 1, ticketsRowsPerPage)} disabled={ticketsLoading}>
                  {ticketsLoading ? <CircularProgress size={24} /> : 'Refresh'}
                </Button>
                <Button color="error" variant="outlined" onClick={handleBulkDeleteTickets} disabled={ticketsLoading || selectedTicketIds.length === 0}>
                  Delete Selected ({selectedTicketIds.length})
                </Button>
              </Box>
            </Box>

            {ticketsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : tickets.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>
                          <Checkbox
                            checked={tickets.length > 0 && tickets.every((ticket) => selectedTicketIds.includes(ticket._id))}
                            indeterminate={selectedTicketIds.length > 0 && !tickets.every((ticket) => selectedTicketIds.includes(ticket._id))}
                            onChange={handleToggleAllTickets}
                          />
                        </TableCell>
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell><strong>Subject</strong></TableCell>
                        <TableCell><strong>User</strong></TableCell>
                        <TableCell><strong>Context</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Message</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket._id} hover>
                          <TableCell>
                            <Checkbox
                              checked={selectedTicketIds.includes(ticket._id)}
                              onChange={() => handleToggleTicket(ticket._id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {dayjs.utc(ticket.createdAt).format('M/D/YYYY h:mm A')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {ticket.subject}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{ticket.userName}</Typography>
                            <Typography variant="caption" color="text.secondary">{ticket.userEmail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{ticket.contextTitle || 'Support'}</Typography>
                            <Typography variant="caption" color="text.secondary">{ticket.contextSlug || 'general'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={ticket.status || 'open'} size="small" color={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'warning'} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 360 }}>
                              {ticket.message}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={ticketsTotal}
                  page={ticketsPage}
                  onPageChange={(_, nextPage) => fetchTickets(nextPage + 1, ticketsRowsPerPage)}
                  rowsPerPage={ticketsRowsPerPage}
                  onRowsPerPageChange={(event) => {
                    const nextRows = parseInt(event.target.value, 10);
                    fetchTickets(1, nextRows);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No support tickets found
              </Typography>
            )}
          </Box>
        )}
      </Card>

      {/* User Edit Dialog */}
      <Dialog open={editUserOpen} onClose={() => setEditUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="First Name"
            value={userFormData.firstName || ''}
            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Last Name"
            value={userFormData.lastName || ''}
            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Email"
            value={userFormData.email || ''}
            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
            fullWidth
            disabled
          />
          <TextField
            select
            label="Role"
            value={userFormData.role || 'guest'}
            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
            fullWidth
          >
            <MenuItem value="guest">Guest</MenuItem>
            <MenuItem value="host">Host</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={userFormData.hasPaid || false}
                onChange={(e) => setUserFormData({ ...userFormData, hasPaid: e.target.checked })}
              />
            }
            label="Has Paid (Verified)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={userFormData.isActive !== false}
                onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
              />
            }
            label="Account Active"
          />
          {selectedUser && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #ddd' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>🔗 Subscription Management</Typography>
              
              <TextField
                select
                label="Current Tier"
                value={userFormData.stripeCurrentTier || 0}
                onChange={(e) => {
                  const tier = parseInt(e.target.value);
                  const tierLimits = { 0: 0, 1: 2, 2: 5, 3: 10, 4: 25 };
                  setUserFormData({
                    ...userFormData,
                    stripeCurrentTier: tier,
                    listingLimit: tierLimits[tier]
                  });
                }}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                <MenuItem value={0}>Free (0 listings)</MenuItem>
                <MenuItem value={1}>Basic - $5/mo (2 listings)</MenuItem>
                <MenuItem value={2}>Growth - $15/mo (5 listings)</MenuItem>
                <MenuItem value={3}>Professional - $30/mo (10 listings)</MenuItem>
                <MenuItem value={4}>Enterprise - $75/mo (25+ listings)</MenuItem>
              </TextField>

              <TextField
                label="Listing Limit"
                type="number"
                value={userFormData.listingLimit || 0}
                onChange={(e) => setUserFormData({ ...userFormData, listingLimit: parseInt(e.target.value) || 0 })}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                helperText="Auto-set when tier is selected"
              />

              <TextField
                select
                label="Subscription Status"
                value={userFormData.subscriptionStatus || ''}
                onChange={(e) => setUserFormData({ ...userFormData, subscriptionStatus: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="trialing">Trialing</MenuItem>
                <MenuItem value="past_due">Past Due</MenuItem>
                <MenuItem value="canceled">Canceled</MenuItem>
                <MenuItem value="incomplete">Incomplete</MenuItem>
              </TextField>

              <TextField
                label="Stripe Subscription ID"
                value={userFormData.stripeSubscriptionId || ''}
                onChange={(e) => setUserFormData({ ...userFormData, stripeSubscriptionId: e.target.value })}
                fullWidth
                size="small"
                placeholder="sub_xxxxxxxxx or leave empty"
                helperText="From Stripe dashboard (optional)"
              />

              {selectedUser.stripeCustomerId && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                  <strong>Stripe Customer ID:</strong> {selectedUser.stripeCustomerId}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Listing Edit Dialog */}
      <Dialog open={editListingOpen} onClose={() => setEditListingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Listing</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Title"
            value={listingFormData.title || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="Description"
            value={listingFormData.description || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <TextField
            label="Price Per Night"
            type="number"
            value={listingFormData.pricePerNight || 0}
            onChange={(e) => setListingFormData({ ...listingFormData, pricePerNight: parseFloat(e.target.value) })}
            fullWidth
          />
          <TextField
            label="Max Guests"
            type="number"
            value={listingFormData.maxGuests || 0}
            onChange={(e) => setListingFormData({ ...listingFormData, maxGuests: parseInt(e.target.value) })}
            fullWidth
          />
          <TextField
            label="Category"
            value={listingFormData.category || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, category: e.target.value })}
            fullWidth
          />
          <TextField
            select
            label="Status"
            value={listingFormData.status || 'inactive'}
            onChange={(e) => setListingFormData({ ...listingFormData, status: e.target.value })}
            fullWidth
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditListingOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveListing} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Booking Edit Dialog */}
      <Dialog open={editBookingOpen} onClose={() => setEditBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Booking</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selectedBooking && (
            <>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Property</Typography>
                <Typography variant="body2">{selectedBooking.property?.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedBooking.property?.city}, {selectedBooking.property?.country}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Guest</Typography>
                <Typography variant="body2">
                  {selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedBooking.guest?.email}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Dates & Price</Typography>
                <Typography variant="body2">
                  {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  Total: ${selectedBooking.totalPrice}
                </Typography>
              </Box>
              <TextField
                select
                label="Status"
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
                fullWidth
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBookingOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveBooking} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
