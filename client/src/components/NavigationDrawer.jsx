import React, { useState, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Badge,
  Button,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  BottomNavigation,
  BottomNavigationAction,
  Paper
} from "@mui/material";
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
import MessageIcon from "@mui/icons-material/Message";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { logout, fetchWithAuth, API_URL } from "../utils/api";
import { useThemeMode } from "../contexts/ThemeContext";
import SiteFooter from "./SiteFooter";

const drawerWidth = 280;
const categories = [
  { value: "apartment", label: "Apartments" },
  { value: "condo", label: "Condos" },
  { value: "house", label: "Houses" },
  { value: "hostel", label: "Hostels" },
  { value: "flat", label: "Flats" },
  { value: "villa", label: "Villas" },
];

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
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { mode, toggleTheme, reEnableCookieNotice } = useThemeMode();

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      if (currentScrollY <= 16) {
        setMobileNavVisible(true);
      } else if (currentScrollY > lastScrollY + 8) {
        setMobileNavVisible(false);
      } else if (currentScrollY < lastScrollY - 8) {
        setMobileNavVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/unread/count`);
      
      // If unauthorized, silently skip (user might be logging out or token expired)
      if (res.status === 401) {
        setUnreadCount(0);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const newCount = data.unreadCount || 0;

      if (newCount > previousUnreadCount && previousUnreadCount !== 0) {
        snackbar(`You have ${newCount} new message${newCount > 1 ? 's' : ''}!`, "info");
        setPollInterval(5000);
      }

      setPreviousUnreadCount(newCount);
      setUnreadCount(newCount);
    } catch (error) {
      // Log but don't show error to avoid spam in console
      if (error.message !== 'HTTP 401') {
        console.error("Failed to fetch unread count:", error);
      }
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

  const handleAccountMenu = (event) => {
    setAccountAnchor(event.currentTarget);
  };

  const closeAccountMenu = () => {
    setAccountAnchor(null);
  };

  const handleMessagesNavigation = () => {
    if (user.role === "host") {
      navigate("/reservations");
    } else if (user.role === "guest") {
      navigate("/trips");
    } else {
      navigate("/login");
    }
  };

  const getMobileNavValue = () => {
    if (location.pathname === "/") {
      return "home";
    }
    if (location.pathname.startsWith("/properties") || location.pathname.startsWith("/browse")) {
      return "explore";
    }
    if (location.pathname.startsWith("/reservations") || location.pathname.startsWith("/trips")) {
      return "messages";
    }
    return false;
  };

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Box sx={{ px: 2, py: 2, cursor: "pointer" }} onClick={() => setOpen(false)}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Beds4Crew
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Marketplace navigation
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItemButton onClick={() => (clickedIconLink("/"))}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/properties"))}>
          <ListItemIcon><HotelIcon /></ListItemIcon>
          <ListItemText primary="All Properties" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/browse"))}>
          <ListItemIcon><PublicIcon /></ListItemIcon>
          <ListItemText primary="Search By Date" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/support"))}>
          <ListItemIcon><SupportIcon /></ListItemIcon>
          <ListItemText primary="Support" />
        </ListItemButton>
        {user.isAdmin && (
          <ListItemButton onClick={() => (clickedIconLink("/admin"))}>
            <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}
      </List>
      <Divider sx={{ my: 1 }} />
      <Accordion disableGutters elevation={0} sx={{ px: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Categories</AccordionSummary>
        <AccordionDetails>
          <List dense>
            {categories.map((category) => (
              <ListItemButton key={category.value} onClick={() => clickedIconLink(`/properties?category=${category.value}`)}>
                <ListItemText primary={category.label} />
              </ListItemButton>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItemButton onClick={() => (clickedIconLink(isEmpty(user) ? "/register" : "/profile"))}>
          <ListItemIcon><AccountCircleIcon /></ListItemIcon>
          <ListItemText primary={isEmpty(user) ? "Register" : "Profile"} />
        </ListItemButton>
        {user.role === "guest" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/favorites"))}>
              <ListItemIcon><FavoriteIcon /></ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/trips"))}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <MessageIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Trips" />
            </ListItemButton>
          </>
        )}
        {user.role === "host" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/profile?tab=listings#listings-tab"))}>
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
                  <MessageIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Reservations" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/pricing"))}>
              <ListItemIcon><TrendingUpIcon /></ListItemIcon>
              <ListItemText primary="Pricing & Plans" />
            </ListItemButton>
          </>
        )}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItemButton onClick={toggleTheme}>
          <ListItemIcon>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </ListItemIcon>
          <ListItemText primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'} />
        </ListItemButton>
        <ListItemButton
          onClick={() => {
            reEnableCookieNotice();
          }}
        >
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Show Cookie Notice" />
        </ListItemButton>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, minHeight: { xs: 64, md: 72 } }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(true)}>
            <Badge badgeContent={unreadCount} color="error">
              <MenuIcon />
            </Badge>
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
              onClick={handleTitleClick}
            >
              Beds4Crew
            </Typography>

            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", ml: 2, gap: 1 }}>
              <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/properties")}>All Properties</Button>
              <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/browse")}>Search by Date</Button>
            </Box>
          </Box>
            
          <Box sx={{ display: "flex", alignItems: "center", p: 1, gap: 1 }}>
            {user.role === "host" && (
              <Button
                variant="outlined"
                size="small"
                sx={{ display: { xs: "none", md: "flex" }, flex: "none", color: "warning.main", borderColor: "warning.main" }}
                onClick={() => navigate("/pricing")}
              >
                💰 Upgrade Plan
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              sx={{ display: { xs: "none", sm: "flex" }, flex: "none" }}
              onClick={() => {
                if (user.role === "host") {
                  navigate("/add-property");
                } else {
                  navigate("/properties");
                }
              }}
            >
              {user.role === "host" ? "New Listing" : "Find a Bed"}
            </Button>
            <IconButton
              color="inherit"
              aria-label="Messages"
              sx={{ display: { xs: "none", md: "inline-flex" } }}
              onClick={handleMessagesNavigation}
            >
              <Badge badgeContent={unreadCount} color="error">
                <MessageIcon />
              </Badge>
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="Support"
              sx={{ display: { xs: "none", md: "inline-flex" } }}
              onClick={() => navigate("/support#top")}
            >
              <SupportAgentIcon />
            </IconButton>
            {!isEmpty(user) ? (
              <IconButton color="inherit" onClick={handleAccountMenu} aria-label="Account menu">
              <Avatar sx={{ width: 32, height: 32 }}>
                {user.firstName?.[0] || "?"}
              </Avatar>
            </IconButton>
            ) : (
              <>
                <IconButton
                  color="inherit"
                  aria-label="Sign in"
                  sx={{ display: { xs: "inline-flex" } }}
                  onClick={() => navigate("/login")}
                >
                  <AccountCircleIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={closeAccountMenu}>
        {(isEmpty(user)
          ? [
              <MenuItem key="login" onClick={() => { closeAccountMenu(); navigate("/login"); }}>Sign in</MenuItem>,
              <MenuItem key="register" onClick={() => { closeAccountMenu(); navigate("/register"); }}>Create account</MenuItem>,
            ]
          : [
              <MenuItem key="profile" onClick={() => { closeAccountMenu(); navigate("/profile"); }}>Profile</MenuItem>,
              ...(user.role === "guest"
                ? [
                    <MenuItem key="favorites" onClick={() => { closeAccountMenu(); navigate("/favorites"); }}>Favorites</MenuItem>,
                    <MenuItem key="trips" onClick={() => { closeAccountMenu(); navigate("/trips"); }}>Trips</MenuItem>,
                  ]
                : []),
              ...(user.role === "host"
                ? [
                    <MenuItem key="listings" onClick={() => { closeAccountMenu(); navigate("/profile?tab=listings#listings-tab"); }}>Listings</MenuItem>,
                    <MenuItem key="reservations" onClick={() => { closeAccountMenu(); navigate("/reservations"); }}>Reservations</MenuItem>,
                    <MenuItem key="pricing" onClick={() => { closeAccountMenu(); navigate("/pricing"); }}>Pricing & Plans</MenuItem>,
                  ]
                : []),
            ])
        }
        <MenuItem key="theme" onClick={() => { closeAccountMenu(); toggleTheme(); }}>
          {mode === "light" ? "Dark Mode" : "Light Mode"}
        </MenuItem>
        {!isEmpty(user) && [
          <Divider key="divider" />,
          <MenuItem key="logout" onClick={() => { closeAccountMenu(); handleLogout(); }}>Log out</MenuItem>,
        ]}
      </Menu>

      <Drawer
        anchor="left"
        open={open}
        onClose={handleBackdropClick}
        sx={{ [`& .MuiDrawer-paper`]: { width: drawerWidth } }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flex: 1, py: { xs: 2, md: 4 }, pb: { xs: 10, md: 4 } }}>
        {children}
      </Box>

      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: 1,
          borderColor: "divider",
          display: { xs: "block", md: "none" },
          transform: mobileNavVisible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 220ms ease",
        }}
      >
        <BottomNavigation showLabels value={getMobileNavValue()}>
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<HomeIcon />}
            onClick={() => navigate("/")}
          />
          <BottomNavigationAction
            label="Search"
            value="explore"
            icon={<PublicIcon />}
            onClick={() => navigate("/browse")}
          />
          <BottomNavigationAction
            label="Messages"
            value="messages"
            icon={(
              <Badge badgeContent={unreadCount} color="error">
                <MessageIcon />
              </Badge>
            )}
            onClick={handleMessagesNavigation}
          />
          <BottomNavigationAction
            label="Menu"
            value="menu"
            icon={<MoreHorizIcon />}
            onClick={() => setOpen(true)}
          />
        </BottomNavigation>
      </Paper>
      <SiteFooter />
    </Box>
  );
}
