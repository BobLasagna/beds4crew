import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Card,
  Button,
  Pagination,
  CircularProgress,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { commonStyles } from "../utils/styleConstants";
import MapView from '../components/HotelMapView';
import PropertyCard from '../components/PropertyCard';
import { useSnackbar } from '../components/AppSnackbar';
import { fetchJson, fetchJsonWithAuth, fetchWithAuth, getStoredUser, isAppTransportMode, API_URL } from '../utils/api';
import { scrollElementIntoViewWithOffset } from '../utils/scroll';
import { useNavigate } from 'react-router-dom';

//TODO: Move to config file or generate based off existing data
const POPULAR_LOCATIONS = [
  { label: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  { label: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { label: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
];

const DEFAULT_LOCATION = { lat: 25.7617, lng: -80.1918 };
const DEFAULT_RADIUS_MILES = 30;
const RESULTS_PER_PAGE = 10;
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

const CITY_NAME_REGEX = /^[A-Za-z]+(?:[\s.'-][A-Za-z]+)*(?:,\s*[A-Za-z]{2})?$/;

const normalizeLocationQuery = (input = '') => input.trim().replace(/\s+/g, ' ');

const getLocationValidation = (input = '') => {
  const query = normalizeLocationQuery(input);

  if (!query) {
    return { query, valid: false, message: '' };
  }

  if (/\d/.test(query)) {
    return {
      query,
      valid: false,
      message: 'City names cannot include numbers.',
    };
  }

  if (query.length < 3) {
    return {
      query,
      valid: false,
      message: 'Enter at least 3 letters for a city.',
    };
  }

  if (CITY_NAME_REGEX.test(query)) {
    return { query, valid: true, message: '' };
  }

  return {
    query,
    valid: false,
    message: 'Use letters/spaces for city names (e.g., Miami, FL).',
  };
};

export default function BrowsePage() {
  const isNativeApp = isAppTransportMode();
  const defaultGridColumns = isNativeApp ? 1 : 3;
  const [allProperties, setAllProperties] = useState([]);
  const [center, setCenter] = useState(DEFAULT_LOCATION);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recommended');
  const [showMap, setShowMap] = useState(true);
  const [showControls] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [gridColumns, setGridColumns] = useState(defaultGridColumns);
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day'));
  const [endDate, setEndDate] = useState(null);
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [activeQueryMode, setActiveQueryMode] = useState(null); // "all" | "date"
  const [lastDateSearchParams, setLastDateSearchParams] = useState(null);
  const snackbar = useSnackbar();
  const gridOptions = [5, 3, 2, 1];
  const navigate = useNavigate();
  const user = getStoredUser();
  const mapSectionRef = useRef(null);
  const resultsListRef = useRef(null);
  const locationValidation = useMemo(
    () => getLocationValidation(locationInput),
    [locationInput]
  );
  const combinedLocationOptions = useMemo(
    () => [...POPULAR_LOCATIONS, ...locationOptions],
    [locationOptions]
  );

  const applyLocationSelection = useCallback((location) => {
    if (!location) return;
    setCenter({ lat: location.lat, lng: location.lng });
    setLocationInput(location.label || '');
    setCurrentPage(1);
  }, []);

  const findMatchingLocationOption = useCallback((input = '') => {
    const normalizedInput = normalizeLocationQuery(input).toLowerCase();
    if (!normalizedInput) return null;

    return (
      combinedLocationOptions.find((option) => {
        const normalizedLabel = normalizeLocationQuery(option.label).toLowerCase();
        return normalizedLabel === normalizedInput;
      }) || null
    );
  }, [combinedLocationOptions]);

  const commitTypedLocationIfMatch = useCallback(() => {
    const match = findMatchingLocationOption(locationInput);
    if (match) {
      applyLocationSelection(match);
    }
  }, [applyLocationSelection, findMatchingLocationOption, locationInput]);

  // Fetch user's wishlist
  useEffect(() => {
    if (!user?.id) return;
    fetchJsonWithAuth(`${API_URL}/users/wishlist`)
      .then(data => setWishlist((data || []).map((property) => property?._id).filter(Boolean)))
      .catch(err => console.error('Failed to fetch wishlist:', err));
  }, [user.id]);

  // No initial load - properties are only loaded via date search
  useEffect(() => {
    setLoading(false);
  }, []);

  // Restore saved search state if returning from property details
  useEffect(() => {
    const savedState = sessionStorage.getItem('browseSearchState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.startDate) setStartDate(dayjs(state.startDate));
        if (state.endDate) setEndDate(dayjs(state.endDate));
        if (state.center) setCenter(state.center);
        if (state.radius) setRadius(state.radius);
        if (state.properties) setAllProperties(state.properties);
        if (state.sortBy) setSortBy(state.sortBy);
        if (state.gridColumns) setGridColumns(isNativeApp ? 1 : state.gridColumns);
        if (state.locationInput) setLocationInput(state.locationInput);
        // Clear the saved state after restoring
        sessionStorage.removeItem('browseSearchState');
      } catch (err) {
        console.error('Failed to restore search state:', err);
      }
    }
  }, [isNativeApp]);

  // Calculate distance in miles between two lat/lng points using Haversine formula
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    // Clamp 'a' to [0, 1] to handle floating-point precision issues
    const clampedA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.asin(Math.sqrt(clampedA));
    return R * c;
  }, []);

  // Filter properties within radius (only those with coordinates)
  const filteredPropertiesWithCoords = useMemo(() => {
    return allProperties.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      const distance = calculateDistance(center.lat, center.lng, p.latitude, p.longitude);
      return distance <= radius;
    });
  }, [allProperties, center, radius, calculateDistance]);

  // All properties for list view
  // Always respect the radius filter - show only properties within radius with coordinates
  const allPropertiesForList = useMemo(() => {
    return filteredPropertiesWithCoords;
  }, [filteredPropertiesWithCoords]);

  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  const paginatedProperties = allPropertiesForList;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (isNativeApp && gridColumns !== 1) {
      setGridColumns(1);
    }
  }, [isNativeApp, gridColumns]);

  const fetchAllPropertiesPage = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(RESULTS_PER_PAGE),
        sort: sortBy,
        lat: String(center.lat),
        lng: String(center.lng),
        radius: String(radius),
      });

      const data = await fetchJson(`${API_URL}/properties?${params.toString()}`);

      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      const pagination = data.pagination || {
        page,
        total: items.length,
        totalPages: 1,
      };

      setAllProperties(items);
      setCurrentPage(pagination.page || page);
      setTotalResults(pagination.total ?? items.length);
      setActiveQueryMode('all');
    } catch (err) {
      console.error('Failed to load all properties:', err);
      snackbar(err.message || 'Failed to load properties', 'error');
      setAllProperties([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [center.lat, center.lng, radius, sortBy, snackbar]);

  const fetchDateFinderPage = useCallback(async (page = 1, searchParamsOverride = null) => {
    const effectiveParams = searchParamsOverride || lastDateSearchParams;
    if (!effectiveParams) return { properties: [], total: 0 };

    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: effectiveParams.lat.toString(),
        lng: effectiveParams.lng.toString(),
        startDate: effectiveParams.startDate,
        endDate: effectiveParams.endDate,
        radius: effectiveParams.radius.toString(),
        minPrice: '0',
        maxPrice: '10000',
        minBeds: '1',
        page: String(page),
        limit: String(RESULTS_PER_PAGE),
        sort: sortBy,
      });

      const data = await fetchJson(`${API_URL}/properties/date-finder?${params.toString()}`);

      const items = Array.isArray(data.properties) ? data.properties : [];
      const pagination = data.pagination || {
        page,
        total: items.length,
        totalPages: 1,
      };

      setAllProperties(items);
      setCurrentPage(pagination.page || page);
      setTotalResults(pagination.total ?? items.length);
      setActiveQueryMode('date');
      if (searchParamsOverride) {
        setLastDateSearchParams(searchParamsOverride);
      }

      return { properties: items, total: pagination.total ?? items.length };
    } catch (err) {
      console.error('Date search error:', err);
      snackbar(err.message || 'Failed to search by dates', 'error');
      setAllProperties([]);
      setTotalResults(0);
      return { properties: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [lastDateSearchParams, sortBy, snackbar]);

  useEffect(() => {
    if (!activeQueryMode) return;
    if (activeQueryMode === 'date' && lastDateSearchParams) {
      fetchDateFinderPage(1, lastDateSearchParams);
      return;
    }
    if (activeQueryMode === 'all') {
      fetchAllPropertiesPage(1);
    }
  }, [sortBy]);

  const saveSearchState = () => {
    const state = {
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      center,
      radius,
      properties: allProperties,
      sortBy,
      gridColumns,
      locationInput,
    };
    sessionStorage.setItem('browseSearchState', JSON.stringify(state));
  };

  const handleResultFocus = (property) => {
    if (!showMap) {
      setShowMap(true);
    }
    if (property.latitude && property.longitude) {
      setCenter({ lat: property.latitude, lng: property.longitude });
    }
    setSelectedPropertyId(property._id);
    window.requestAnimationFrame(() => {
      const mapEl = mapSectionRef.current;
      scrollElementIntoViewWithOffset(mapEl, { extraOffset: 12 });
    });
  };

  const renderResultCard = (prop) => (
    <PropertyCard
      key={prop._id}
      property={prop}
      layout="browseSearch"
      onCardClick={() => handleResultFocus(prop)}
      onViewDetails={() => {
        saveSearchState();
        navigate(`/property/${prop._id}`);
      }}
      onWishlistToggle={handleToggleWishlist}
      isWishlisted={wishlist.includes(prop._id)}
      showWishlist
    />
  );

  // Debounced location search for autocomplete
  useEffect(() => {
    if (!locationValidation.query || !locationValidation.valid) {
      setLocationOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const data = await fetchJson(`${API_URL}/geocoding/search?q=${encodeURIComponent(locationValidation.query)}`);
        if (data.lat && data.lon) {
          setLocationOptions([{
            label: data.display_name || locationValidation.query,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon)
          }]);
        } else {
          setLocationOptions([]);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setLocationOptions([]);
      } finally {
        setGeocoding(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationValidation]);

  // Search by date range
  const handleDateSearch = async () => {
    if (!startDate || !endDate) {
      snackbar('Please select both start and end dates', 'warning');
      return;
    }

    if (endDate.isBefore(startDate)) {
      snackbar('End date must be after start date', 'error');
      return;
    }

    const params = {
      lat: center.lat,
      lng: center.lng,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      radius,
    };

    const result = await fetchDateFinderPage(1, params);

    // Select first property and scroll to results
    if (result.properties.length > 0) {
      setSelectedPropertyId(result.properties[0]._id);
      setTimeout(() => {
        const resultsEl = resultsListRef.current;
        scrollElementIntoViewWithOffset(resultsEl, { extraOffset: 20 });
      }, 100);
    }

    if (result.total === 0) {
      snackbar('No available properties found for those dates', 'info');
    } else {
      snackbar(`Found ${result.total} available propert${result.total === 1 ? 'y' : 'ies'}`, 'success');
    }
  };

  const handleResetFilters = () => {
    setCenter(DEFAULT_LOCATION);
    setRadius(DEFAULT_RADIUS_MILES);
    setSortBy('recommended');
    setCurrentPage(1);
    setStartDate(null);
    setEndDate(null);
    setLocationInput('');
    setLastDateSearchParams(null);
    fetchAllPropertiesPage(1);
  };

  const handleToggleWishlist = async (propertyId) => {
    if (!user?.id) {
      snackbar('Please login to save favorites', 'warning');
      return;
    }
    
    const inWishlist = wishlist.includes(propertyId);
    const method = inWishlist ? 'DELETE' : 'POST';

    try {
      const res = await fetchWithAuth(`${API_URL}/users/wishlist/${propertyId}`, { method });
      if (res.ok) {
        setWishlist(prev => {
          if (inWishlist) {
            snackbar('Property removed from favorites', 'info');
            return prev.filter(id => id !== propertyId);
          } else {
            snackbar('Property saved to favorites', 'info');
            return [...prev, propertyId];
          }
        });
      }
    } catch {
      snackbar('Failed to update favorites', 'error');
    }
  };

  const selectedLocation = POPULAR_LOCATIONS.find(
    l => l.lat === center.lat && l.lng === center.lng
  )?.label || '';

  const nights = startDate && endDate ? dayjs(endDate).startOf("day").diff(dayjs(startDate).startOf("day"), "day") : 0;

  return (
    <Box sx={{ ...commonStyles.contentContainer}}>  
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        Search Beds By Date
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Search by location, adjust radius, and refine results.
      </Typography>
      {/* <FormControlLabel
        control={<Switch checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />}
        label={showMap ? 'Map' : 'Map off'}
      />
      <FormControlLabel
        control={<Switch checked={showControls} onChange={(e) => setShowControls(e.target.checked)} />}
        label={showControls ? 'Controls' : 'Controls off'}
      /> */}

      {/* Controls Section */}
      {showControls && (
        <Card sx={{ p: 2, mb: 3 }}>
          {/* Date Search Section */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Search Available Properties by Date
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <DatePicker
                label="Check-in Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue ? dayjs(newValue) : null)}
                closeOnSelect
                minDate={dayjs()}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <DatePicker
                label="Check-out Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue ? dayjs(newValue) : null)}
                closeOnSelect
                minDate={startDate || dayjs()}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="1 Week"
                  disabled={!startDate} clickable size="small" color="primary" variant="outlined"
                  onClick={() => {
                    if (startDate) setEndDate(dayjs(startDate).add(7, 'day')) }
                  }
                />
                <Chip
                  label="1 Month"
                  disabled={!startDate} clickable size="small" color="primary" variant="outlined"
                  onClick={() => {
                    if (startDate) setEndDate(dayjs(startDate).add(1, 'month')); }
                  }
                />
                {nights > 0 && (
                  <Chip
                    label={`${nights} night${nights > 1 ? "s" : ""}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            <Button
              variant="contained"
              fullWidth
              onClick={handleDateSearch}
              disabled={!startDate || !endDate || loading}
            >
              {loading ? 'Searching...' : 'Search Available Properties'}
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* Location Search with Autocomplete */}
            <Autocomplete
              freeSolo
              options={combinedLocationOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
              inputValue={locationInput}
              onInputChange={(_, value) => setLocationInput(value)}
              onChange={(e, value) => {
                if (value && typeof value === 'object') {
                  applyLocationSelection(value);
                  return;
                }

                if (typeof value === 'string') {
                  const match = findMatchingLocationOption(value);
                  if (match) {
                    applyLocationSelection(match);
                  }
                }
              }}
              loading={geocoding}
              renderInput={(params) => (
                <TextField
                  {...params}
                  onBlur={commitTypedLocationIfMatch}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      commitTypedLocationIfMatch();
                    }
                  }}
                  label="Search Location"
                  placeholder="City (e.g. Miami, FL)"
                  error={Boolean(locationValidation.query) && !locationValidation.valid}
                  helperText={
                    locationValidation.query && !locationValidation.valid
                      ? locationValidation.message
                      : 'Search by city name only'
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {geocoding ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Box>
              <Typography variant="body2" gutterBottom>
                Search Radius: {radius} miles
              </Typography>
              <Slider
                value={radius}
                onChange={(_, val) => {
                  setRadius(val);
                  setCurrentPage(1);
                }}
                min={10}
                max={250}
                step={10}
                valueLabelDisplay="auto"
                aria-label="Search radius in miles"
              />
            </Box>

            <TextField
              select
              label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              fullWidth
              helperText="Order your results"
            >
              {SORT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            
          </Box>
          {/* Stats */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip label={`${allPropertiesForList.length} total`} variant="outlined" />
            <Chip label={`${filteredPropertiesWithCoords.length} within ${radius} miles`} variant="outlined" />
            {startDate && endDate && (
              <Chip 
                label={`${startDate.format('MMM D')} - ${endDate.format('MMM D')}`} 
                color="primary"
                onDelete={() => {
                  setStartDate(null);
                  setEndDate(null);
                  handleResetFilters();
                }}
              />
            )}
            <Box sx={{ ml: 'auto' }}>
              <Button size="small" variant="outlined" onClick={handleResetFilters}>
                Reset All
              </Button>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              <>
                {totalResults} results
                {startDate && endDate && <Typography variant="caption" component="span" sx={{ ml: 1, color: 'primary.main' }}>(showing available properties for selected dates)</Typography>}
              </>
            )}
          </Typography>

        </Card>
      )}

      {/* Map Section */}
      {showMap && (
        <Card ref={mapSectionRef} sx={{ height: 'auto', overflow: 'hidden', mb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredPropertiesWithCoords.length > 0 ? (
            <MapView
              properties={filteredPropertiesWithCoords}
              center={center}
              radius={radius}
              selectedPropertyId={selectedPropertyId}
              onMarkerSelect={(id) => setSelectedPropertyId(id)}
              onSelectionClear={() => setSelectedPropertyId(null)}
              onPropertyClick={(id) => {
                saveSearchState();
                navigate(`/property/${id}`);
              }}
              onPropertyBookClick={(id) => {
                saveSearchState();
                navigate(`/property/${id}?scrollTo=reservation`);
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', p: 3 }}>
              <Typography color="text.secondary" textAlign="center">
                No properties found within {radius} miles.
                <br />
                <Typography variant="caption" component="span">
                  Try increasing the search radius or selecting a different location.
                </Typography>
              </Typography>
            </Box>
          )}
        </Card>
      )}

      {/* Results List Section */}
      <Box ref={resultsListRef}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Typography variant="h6">
            Results ({totalResults})
          </Typography>
          {!isNativeApp && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Results per row
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={gridColumns}
                onChange={(_, value) => {
                  if (value) setGridColumns(value);
                }}
              >
                {gridOptions.map((option) => (
                  <ToggleButton key={option} value={option}>
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : paginatedProperties.length > 0 ? (
          <>
            <Box
              sx={(theme) => ({
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                gap: theme.spacing(3),
                mb: 3,
              })}
            >
              {paginatedProperties.map((prop) => (
                <Box
                  key={prop._id}
                  sx={(theme) => ({
                    flex: `1 1 calc((100% - (${theme.spacing(3)} * ${gridColumns - 1})) / ${gridColumns})`,
                    minWidth: 0,
                  })}
                >
                  {renderResultCard(prop)}
                </Box>
              ))}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, val) => {
                    if (activeQueryMode === 'date') {
                      fetchDateFinderPage(val);
                      return;
                    }
                    fetchAllPropertiesPage(val);
                  }}
                />
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              No properties found within {radius} miles of {selectedLocation || 'this location'}.
            </Typography>
            <Button sx={{ mt: 1 }} variant="outlined" onClick={handleResetFilters}>
              Reset filters
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
