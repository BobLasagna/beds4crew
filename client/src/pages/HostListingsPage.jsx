import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, formatPriceDisplay, API_URL, BASE_URL } from "../utils/api";

export default function HostListingsPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [sortedProperties, setSortedProperties] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("title-asc");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const snackbar = useSnackbar();

  useEffect(() => {
    fetchProperties();
  }, [user.id]);

  useEffect(() => {
    let sorted = [...properties];

    switch (sortBy) {
      case "price-low-high":
        sorted.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
        break;
      case "price-high-low":
        sorted.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
        break;
      case "title-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "status-active":
        sorted.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
        break;
      case "status-inactive":
        sorted.sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        break;
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    setSortedProperties(sorted);
  }, [properties, sortBy]);

  const fetchProperties = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/properties/mine`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      snackbar("Failed to load properties", "error");
    }
  };

  const handleDeleteClick = (property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    
    try {
      setLoading(true);
      const res = await fetchWithAuth(
        `${API_URL}/properties/${propertyToDelete._id}`,
        { method: "DELETE" }
      );
      
      if (!res.ok) throw new Error("Failed to delete property");
      
      setProperties(prev => prev.filter(p => p._id !== propertyToDelete._id));
      snackbar("Property deleted successfully", "success");
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (err) {
      snackbar("Failed to delete property", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", my: 4 }}>
      <Typography variant="h4" mb={2}>My Listings</Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Manage your properties and configure rooms/beds to activate them for bookings.
      </Typography>
      
      {/* Sorting Controls */}
      {properties.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <TextField
            select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="title-asc">Title (A-Z)</MenuItem>
            <MenuItem value="title-desc">Title (Z-A)</MenuItem>
            <MenuItem value="price-low-high">Price (Low to High)</MenuItem>
            <MenuItem value="price-high-low">Price (High to Low)</MenuItem>
            <MenuItem value="status-active">Status (Active First)</MenuItem>
            <MenuItem value="status-inactive">Status (Inactive First)</MenuItem>
          </TextField>
        </Box>
      )}
      
      <Grid container spacing={2}>
        {sortedProperties.map(prop => (
          <Grid item xs={12} sm={6} md={4} key={prop._id}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardMedia
                component="img"
                height="160"
                image={prop.images?.[0] ? `${BASE_URL}${prop.images[0].path || prop.images[0]}` : "https://mui.com/static/images/cards/contemplative-reptile.jpg"}
                alt={prop.title}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                  <Typography variant="h6" sx={{ flex: 1 }}>{prop.title}</Typography>
                  <Chip
                    label={prop.isActive ? "Active" : "Inactive"}
                    color={prop.isActive ? "success" : "default"}
                    size="small"
                  />
                </Box>
                <Typography color="text.secondary" variant="body2">{prop.category} – {prop.type}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{prop.address}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                  {formatPriceDisplay(prop)} • {prop.maxGuests || "0"} guests
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
                  {prop.rooms?.length || 0} room{prop.rooms?.length !== 1 ? "s" : ""} configured
                </Typography>
              </CardContent>
              
              <CardActions sx={{ pt: 0 }}>
                <Button 
                  size="small" 
                  onClick={() => navigate(`/property/${prop._id}`)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!properties.length && (
        <Typography sx={{ mt: 5, color: "gray", textAlign: "center" }}>
          No listings created yet. <a href="/add-property">Create your first property</a>
        </Typography>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Property?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{propertyToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
