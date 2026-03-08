/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeContextProvider');
  }
  return context;
};

export const ThemeContextProvider = ({ children }) => {
  const COOKIE_NOTICE_KEY = 'cookieNoticeDismissed';
  const semanticTokens = {
    light: {
      primary: {
        main: '#1dbf73',
        light: '#43c784',
        dark: '#10945a',
      },
      secondary: {
        main: '#111827',
        light: '#374151',
        dark: '#0b0f19',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#475569',
      },
      divider: '#e2e8f0',
      surface: {
        subtle: '#f1f5f9',
        elevated: '#ffffff',
      },
      border: {
        subtle: '#e2e8f0',
        strong: '#cbd5e1',
      },
    },
    dark: {
      primary: {
        main: '#1dbf73',
        light: '#52d18d',
        dark: '#0b8e53',
      },
      secondary: {
        main: '#e2e8f0',
        light: '#f8fafc',
        dark: '#94a3b8',
      },
      background: {
        default: '#0b1120',
        paper: '#111827',
      },
      text: {
        primary: '#f8fafc',
        secondary: '#cbd5f5',
      },
      divider: '#334155',
      surface: {
        subtle: '#162033',
        elevated: '#111827',
      },
      border: {
        subtle: '#334155',
        strong: '#475569',
      },
    },
  };
  // Get initial mode from localStorage, default to 'light'
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });
  const [cookieNoticeDismissed, setCookieNoticeDismissed] = useState(() => {
    return localStorage.getItem(COOKIE_NOTICE_KEY) === 'true';
  });

  // Persist mode to localStorage and update body data-theme attribute whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(COOKIE_NOTICE_KEY, cookieNoticeDismissed ? 'true' : 'false');
  }, [cookieNoticeDismissed]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const dismissCookieNotice = () => {
    setCookieNoticeDismissed(true);
  };

  const reEnableCookieNotice = () => {
    setCookieNoticeDismissed(false);
  };

  // Create theme based on current mode
  const theme = useMemo(
    () => {
      const modeTokens = semanticTokens[mode];

      const baseTheme = createTheme({
        palette: {
          mode,
          primary: modeTokens.primary,
          secondary: modeTokens.secondary,
          background: modeTokens.background,
          text: modeTokens.text,
          divider: modeTokens.divider,
          success: {
            main: '#16a34a',
            light: '#4ade80',
            dark: '#15803d',
          },
          warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
          },
          error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
          },
          info: {
            main: '#3b82f6',
            light: '#60a5fa',
            dark: '#2563eb',
          },
          surface: modeTokens.surface,
          border: modeTokens.border,
        },
        typography: {
          fontFamily: 'Inter, Nunito, sans-serif',
          htmlFontSize: 16,
          h1: {
            fontWeight: 700,
            fontSize: 'clamp(1.9rem, 4.6vw, 2.75rem)',
            lineHeight: 1.18,
          },
          h2: {
            fontWeight: 700,
            fontSize: 'clamp(1.65rem, 4vw, 2.25rem)',
            lineHeight: 1.2,
          },
          h3: {
            fontWeight: 700,
            fontSize: 'clamp(1.45rem, 3.5vw, 1.9rem)',
            lineHeight: 1.24,
          },
          h4: {
            fontWeight: 700,
            fontSize: 'clamp(1.3rem, 3.2vw, 1.6rem)',
            lineHeight: 1.28,
          },
          h5: {
            fontWeight: 700,
            fontSize: 'clamp(1.15rem, 2.8vw, 1.35rem)',
            lineHeight: 1.3,
          },
          h6: {
            fontWeight: 600,
            fontSize: 'clamp(1.05rem, 2.4vw, 1.2rem)',
            lineHeight: 1.34,
          },
          subtitle1: {
            fontWeight: 600,
            fontSize: 'clamp(0.98rem, 2.2vw, 1.08rem)',
            lineHeight: 1.45,
          },
          body1: {
            fontSize: 'clamp(0.98rem, 2.15vw, 1.05rem)',
            lineHeight: 1.58,
          },
          body2: {
            fontSize: 'clamp(0.92rem, 2vw, 0.98rem)',
            lineHeight: 1.56,
          },
          button: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.96rem',
            lineHeight: 1.2,
          },
          caption: {
            fontSize: '0.84rem',
            lineHeight: 1.4,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderColor: modeTokens.border.subtle,
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                minHeight: 44,
                borderRadius: 10,
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                minWidth: 40,
                minHeight: 40,
              },
            },
          },
        },
      });

      return responsiveFontSizes(baseTheme);
    },
    [mode]
  );

  return (
    <ThemeContext.Provider
      value={{ mode, toggleTheme, cookieNoticeDismissed, dismissCookieNotice, reEnableCookieNotice }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
