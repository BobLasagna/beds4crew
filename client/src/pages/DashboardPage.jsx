import React from "react";
import { Typography, Box, Button } from "@mui/material";

export default function DashboardPage() {
  // Fetch user info from localStorage or state management later
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return (
    <Box sx={{ maxWidth: 700, margin: "40px auto", p: 3 }}>
      <Typography variant="h3" mb={2}>Welcome, {user.firstName || "Guest"}!</Typography>
      <Typography variant="body1" mb={3}>
        This is your dashboard.<br /> 
          <Button variant="contained" color="primary" href="/profile" sx={{ mr: 2, mb: 2 }}>
            View Profile
          </Button>
          {/* <Button variant="contained" color="secondary" href="/wishlist" sx={{ mr: 2, mb: 2 }}>
            My Wishlist
          </Button> */}
          {user.role === "host" && (
            <Button variant="contained" color="success" href="/my-listings" sx={{ mr: 2, mb: 2 }}>
              My Listings
            </Button>
          )}
        - Guests: Browse properties and make bookings.<br />
        - Hosts: Manage your listings and reservations.<br />
      </Typography>
      {/* We'll add properties, booking, host features here */}
    </Box>
  );
}
