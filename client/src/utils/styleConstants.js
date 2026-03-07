// Design system constants for consistent styling across the app

// Container widths
export const CONTAINER_WIDTHS = {
  auth: 420,        // Login, Register, Support pages
  content: 1200,    // Main content pages (Feed, Listings, etc)
  detail: 900,      // Detail pages (Property Detail)
  form: 700,        // Form pages (Add Property)
};

// Spacing system (follows 8px grid)
export const SPACING = {
  xs: 0.5,   // 4px
  sm: 1,     // 8px
  md: 2,     // 16px
  lg: 3,     // 24px
  xl: 4,     // 32px
  xxl: 6,    // 48px
};

// Consistent padding for containers
export const CONTAINER_PADDING = {
  xs: 1.5,  // Mobile
  sm: 3,  // Tablet
  md: 3,  // Desktop
};

// Typography scale tuned for mobile readability and desktop continuity
export const TYPOGRAPHY_SCALE = {
  pageTitle: {
    fontSize: { xs: '1.375rem', sm: '1.6rem', md: '1.85rem' },
    lineHeight: { xs: 1.3, sm: 1.28, md: 1.24 },
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: { xs: '1.08rem', sm: '1.2rem', md: '1.3rem' },
    lineHeight: { xs: 1.35, sm: 1.32, md: 1.28 },
    fontWeight: 600,
  },
  body: {
    fontSize: { xs: '0.98rem', sm: '1rem', md: '1.02rem' },
    lineHeight: { xs: 1.58, sm: 1.56, md: 1.54 },
  },
};

// Consistent margins
export const PAGE_MARGIN = {
  top: { xs: 2, sm: 3, md: 4 },
  bottom: { xs: 2, sm: 3, md: 4 },
};

// Button spacing
export const BUTTON_SPACING = {
  topBottom: 2,
  betweenButtons: 1,
};

// Card heights
export const CARD_IMAGE_HEIGHT = {
  small: 140,
  medium: 160,
  large: 200,
};

// Border radius
export const BORDER_RADIUS = {
  small: 1,
  medium: 2,
  large: 3,
};

// Token parity set for components that use exported constants directly
export const COLOR_TOKENS = {
  light: {
    calendar: {
      free: '#4caf50',
      partial: '#ffeb3b',
      pending: '#2196f3',
      blocked: '#ff9800',
      booked: '#f44336',
      past: '#e0e0e0',
      mutedText: '#6b7280',
      contrastText: '#0f172a',
    },
    map: {
      clusterBg: '#ff6b6b',
      clusterText: '#ffffff',
      popupBg: '#ffffff',
      popupText: '#0f172a',
    },
  },
  dark: {
    calendar: {
      free: '#22c55e',
      partial: '#facc15',
      pending: '#3b82f6',
      blocked: '#f59e0b',
      booked: '#ef4444',
      past: '#334155',
      mutedText: '#94a3b8',
      contrastText: '#f8fafc',
    },
    map: {
      clusterBg: '#fb7185',
      clusterText: '#0f172a',
      popupBg: '#111827',
      popupText: '#f8fafc',
    },
  },
};

export const getCalendarColors = (mode = 'light') => {
  return COLOR_TOKENS[mode]?.calendar || COLOR_TOKENS.light.calendar;
};

export const getMapColors = (mode = 'light') => {
  return COLOR_TOKENS[mode]?.map || COLOR_TOKENS.light.map;
};

export const CALENDAR_COLORS = {
  ...COLOR_TOKENS.light.calendar,
};

export const MAP_COLORS = {
  ...COLOR_TOKENS.light.map,
};

// Common sx props for reuse
export const commonStyles = {
  // Auth page container (Login, Register, Support)
  authContainer: {
    maxWidth: CONTAINER_WIDTHS.auth,
    mx: "auto",
    mt: { xs: 3, sm: 4, md: 5 },
    mb: { xs: 3, sm: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Main content container (Feed, Listings, etc)
  contentContainer: {
    maxWidth: CONTAINER_WIDTHS.content,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Detail page container
  detailContainer: {
    maxWidth: CONTAINER_WIDTHS.detail,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Form container
  formContainer: {
    maxWidth: CONTAINER_WIDTHS.form,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Full width button
  fullWidthButton: {
    mt: SPACING.md,
    mb: SPACING.sm,
    py: 1.5,
  },

  // Section spacing
  sectionSpacing: {
    mb: { xs: 2, sm: 3 },
  },

  // Card
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: 3,
    },
  },

  // Empty state
  emptyState: {
    textAlign: "center",
    py: { xs: 6, sm: 8, md: 10 },
    color: "text.secondary",
  },

  // Page title
  pageTitle: {
    mb: { xs: 2, sm: 3 },
    ...TYPOGRAPHY_SCALE.pageTitle,
    letterSpacing: '-0.01em',
  },

  // Section title
  sectionTitle: {
    mb: 2,
    ...TYPOGRAPHY_SCALE.sectionTitle,
  },
};
