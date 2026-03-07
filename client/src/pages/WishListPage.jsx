import React, { useEffect, useState } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useLocation } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { LoadingState, NoFavorites } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchJsonWithAuth, fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function WishListPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const snackbar = useSnackbar();

  useEffect(() => {
    async function fetchWishlist() {
      setLoading(true);
      try {
        const summary = await fetchJsonWithAuth(`${API_URL}/users/wishlist/summary`);
        setProperties(Array.isArray(summary) ? summary : []);
      } finally {
        setLoading(false);
      }
    }
    fetchWishlist();
  }, [location.pathname]);

  const handleRemove = async (propId) => {
    const res = await fetchWithAuth(`${API_URL}/users/wishlist/${propId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setProperties(prev => prev.filter(p => p._id !== propId));
      snackbar("Property removed from favorites", "info");
    }
  };

  if (loading) {
    return <LoadingState message="Loading favorites..." />;
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        My Favorites
      </Typography>
      
      {properties.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {properties.map(prop => (
            <Grid item xs={12} sm={6} md={4} key={prop._id}>
              <PropertyCard
                property={prop}
                onWishlistToggle={handleRemove}
                isWishlisted={true}
                showWishlist={true}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <NoFavorites />
      )}
    </Box>
  );
}
