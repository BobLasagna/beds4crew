import React, { useState, useEffect } from "react";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Toolbar, AppBar, Typography, Box, Button, Badge } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HotelIcon from "@mui/icons-material/Hotel";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import PublicIcon from "@mui/icons-material/Public";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SupportIcon from "@mui/icons-material/Support";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { logout, fetchWithAuth, API_URL } from "../utils/api";
import { useThemeMode } from "../contexts/ThemeContext";

const drawerWidth = 220;

function isEmpty(obj) {
  if (obj === null || typeof obj === 'undefined') {
    return false;
  }
  return Object.keys(obj).length === 0;
};

export default function NavigationDrawer({ children }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [pollInterval, setPollInterval] = useState(5000);
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { mode, toggleTheme } = useThemeMode();

  useEffect(() => {
    if (!isEmpty(user)) {
      fetchUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
        setPollInterval(prev => Math.min(prev + 5000, 30000));
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [user.id, pollInterval]);

  useEffect(() => {
    if (open) {
      setPollInterval(5000);
    }
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/unread/count`);
      const data = await res.json();
      const newCount = data.unreadCount || 0;

      if (newCount > previousUnreadCount && previousUnreadCount !== 0) {
        snackbar(`You have ${newCount} new message${newCount > 1 ? 's' : ''}!`, "info");
        setPollInterval(5000);
      }

      setPreviousUnreadCount(newCount);
      setUnreadCount(newCount);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    snackbar("Logged out successfully", "info");
    navigate("/login");
  };

  const clickedIconLink = (link) => {
    setOpen(false);
    navigate(link);
  };

  const handleTitleClick = () => {
    setOpen(false);
    navigate("/");
  };

  const handleBackdropClick = () => {
    setOpen(false);
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        <ListItemButton onClick={() => (clickedIconLink("/"))}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink(isEmpty(user) ? "/register" : "/profile"))}>
          <ListItemIcon><AccountCircleIcon /></ListItemIcon>
          <ListItemText primary={isEmpty(user) ? "Register" : "Profile"} />
        </ListItemButton>
        
        {user.role === "guest" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/wishlist"))}>
              <ListItemIcon><FavoriteIcon /></ListItemIcon>
              <ListItemText primary="Wishlist" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/trips"))}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <HotelIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="My Trips" />
            </ListItemButton>
          </>
        )}

        {user.role === "host" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/my-listings"))}>
              <ListItemIcon><BusinessIcon /></ListItemIcon>
              <ListItemText primary="My Listings" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/add-property"))}>
              <ListItemIcon><AddCircleIcon /></ListItemIcon>
              <ListItemText primary="Add Property" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/reservations"))}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <SettingsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Reservations" />
            </ListItemButton>
          </>
        )}

        <ListItemButton onClick={() => (clickedIconLink("/properties"))}>
          <ListItemIcon><HotelIcon /></ListItemIcon>
          <ListItemText primary="Browse Properties" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/browse"))}>
          <ListItemIcon><PublicIcon /></ListItemIcon>
          <ListItemText primary="Map View" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/support"))}>
          <ListItemIcon><SupportIcon /></ListItemIcon>
          <ListItemText primary="Support" />
        </ListItemButton>

        <Divider sx={{ my: 1 }} />
        
        <ListItemButton onClick={toggleTheme}>
          <ListItemIcon>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </ListItemIcon>
          <ListItemText primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'} />
        </ListItemButton>
        
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex"}}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <Badge badgeContent={unreadCount} color="error">
              <MenuIcon />
            </Badge>
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={handleTitleClick}
          >
            Beds4Crew&nbsp;&copy;
          </Typography>
          {isEmpty(user) && (
            <IconButton color="inherit" edge="end" onClick={() => navigate("/login")}>
              <AccountCircleIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        onClose={handleBackdropClick}
        sx={{
          width: 'auto',
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
        ModalProps={{
          keepMounted: true,
          onBackdropClick: handleBackdropClick,
        }}
      >
        {drawer}
      </Drawer>
      {open && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: (theme) => theme.zIndex.drawer - 1,
          }}
          onClick={handleBackdropClick}
        />
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: open ? `${drawerWidth}px` : 0, transition: "margin .2s" }}>
        {children}
      </Box>
    </Box>
  );
}
