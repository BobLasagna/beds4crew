import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Drawer,
  Button,
  Pagination,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Slider,
  Select,
  InputLabel,
  FormControl,
  Divider,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from "@mui/material";
import { useLocation, useSearchParams } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { NoPropertiesFound } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchJson, fetchJsonWithAuth, fetchWithAuth, getStoredUser, isAppTransportMode, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { scrollElementIntoViewWithOffset } from "../utils/scroll";

const RESULTS_PER_PAGE = 12;
const MAX_PRICE = 500;

export default function PropertyFeedPage() {
  const isNativeApp = isAppTransportMode();
  const defaultGridColumns = isNativeApp ? 1 : 3;
  const [properties, setProperties] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [minRating, setMinRating] = useState(0);

  const [appliedFacilities, setAppliedFacilities] = useState([]);
  const [appliedPriceRange, setAppliedPriceRange] = useState([0, MAX_PRICE]);
  const [appliedMinRating, setAppliedMinRating] = useState(0);

  const [sortBy, setSortBy] = useState("best");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [gridColumns, setGridColumns] = useState(defaultGridColumns);
  const listingsTopRef = useRef(null);
  const user = getStoredUser();
  const location = useLocation();
  const snackbar = useSnackbar();
  const gridOptions = [5, 3, 2, 1];
  const facilityOptions = ["AC", "BBQ", "Laundry", "WiFi", "Kitchen", "Parking", "Pool", "TV", "Workspace"];
  
  // Fetch user's wishlist on mount and when navigating to this page
  useEffect(() => {
    if (!user?.id) return;
    fetchJsonWithAuth(`${API_URL}/users/wishlist`)
      .then((data) => setWishlist((data || []).map((property) => property?._id).filter(Boolean)))
        .catch(() => {});
  }, [user.id, location.pathname]);

  const handleToggleWishlist = async (propertyId) => {
    if (!user?.id) {
      snackbar("Must be logged in to save favorites", "error");
      return;
    }
    const inWishlist = wishlist.includes(propertyId);
    const method = inWishlist ? "DELETE" : "POST";
    const res = await fetchWithAuth(`${API_URL}/users/wishlist/${propertyId}`, {
      method: method
    });
    if (res.ok) {
      if (inWishlist) {
        snackbar("Property removed from favorites", "info");
        setWishlist(prev => prev.filter(id => id !== propertyId));
      } else {
        snackbar("Property saved to favorites", "info");
        setWishlist(prev => [...prev, propertyId]);
      }
    }
  };

  const fetchProperties = async (page = 1) => {
    setLoading(true);
    try {
      const sortMap = {
        best: "recommended",
        rating: "rating",
        priceLow: "price-low",
        priceHigh: "price-high",
      };

      const params = new URLSearchParams({
        page: String(page),
        limit: String(RESULTS_PER_PAGE),
        sort: sortMap[sortBy] || "recommended",
        query,
        category,
        type,
        minRating: String(appliedMinRating),
      });

      if (appliedPriceRange[0] > 0) {
        params.set("minPrice", String(appliedPriceRange[0]));
      }

      if (appliedPriceRange[1] < MAX_PRICE) {
        params.set("maxPrice", String(appliedPriceRange[1]));
      }

      if (appliedFacilities.length > 0) {
        params.set("facilities", appliedFacilities.join(","));
      }

      const data = await fetchJson(`${API_URL}/properties?${params.toString()}`);

      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

      const pagination = data?.pagination || {
        page,
        total: items.length,
        totalPages: 1,
      };

      setProperties(items);
      setCurrentPage(pagination.page || page);
      setTotalResults(pagination.total ?? items.length);
      setTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      snackbar(err.message || "Failed to load listings", "error");
      setProperties([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Fetch paginated properties
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties(currentPage);
    }, 250);

    return () => clearTimeout(timer);
  }, [
    location.pathname,
    currentPage,
    query,
    category,
    type,
    appliedPriceRange,
    appliedMinRating,
    appliedFacilities,
    sortBy,
  ]);

  useEffect(() => {
    const initialQuery = searchParams.get("query") || "";
    const initialCategory = searchParams.get("category") || "";
    setQuery(initialQuery);
    setQueryInput(initialQuery);
    setCategory(initialCategory);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, type, appliedPriceRange, appliedMinRating, appliedFacilities, sortBy]);

  useEffect(() => {
    if (isNativeApp && gridColumns !== 1) {
      setGridColumns(1);
    }
  }, [isNativeApp, gridColumns]);

  const visibleListings = useMemo(() => properties, [properties]);

  const activeFilters = useMemo(() => {
    const items = [];
    if (category) {
      items.push({ key: "category", label: `Category: ${category.charAt(0).toUpperCase()}${category.slice(1)}` });
    }
    if (type) {
      const typeLabel =
        type === "private" ? "Private Room" : type === "bed" ? "Individual Bed" : "Accommodation";
      items.push({ key: "type", label: `Type: ${typeLabel}` });
    }
    return items;
  }, [category, type]);

  const applyTextSearch = () => {
    setQuery(queryInput.trim());
    setAppliedPriceRange(priceRange);
    setAppliedMinRating(minRating);
    setAppliedFacilities(selectedFacilities);
    requestAnimationFrame(() => {
      scrollElementIntoViewWithOffset(listingsTopRef.current, { extraOffset: 12 });
    });
  };

  const handleResetFilters = () => {
    const resetPriceRange = [0, MAX_PRICE];
    setCategory("");
    setType("");
    setQueryInput("");
    setQuery("");
    setPriceRange(resetPriceRange);
    setMinRating(0);
    setSelectedFacilities([]);
    setAppliedPriceRange(resetPriceRange);
    setAppliedMinRating(0);
    setAppliedFacilities([]);
    requestAnimationFrame(() => {
      scrollElementIntoViewWithOffset(listingsTopRef.current, { extraOffset: 12 });
    });
  };

  const filterPanel = (
    <Box sx={{ width: { xs: 280, md: 300 }, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        Filters
      </Typography>
      <TextField
        select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <MenuItem value="">All categories</MenuItem>
        <MenuItem value="apartment">Apartments</MenuItem>
        <MenuItem value="condo">Condos</MenuItem>
        <MenuItem value="house">Houses</MenuItem>
        <MenuItem value="hostel">Hostels</MenuItem>
        <MenuItem value="flat">Flats</MenuItem>
        <MenuItem value="villa">Villas</MenuItem>
      </TextField>
      <TextField
        select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <MenuItem value="">Any</MenuItem>
        <MenuItem value="accommodation">Accommodation</MenuItem>
        <MenuItem value="private">Private Room</MenuItem>
        <MenuItem value="bed">Individual Bed</MenuItem>
      </TextField>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Price range
      </Typography>
      <Slider
        value={priceRange}
        min={0}
        max={MAX_PRICE}
        onChange={(_, value) => setPriceRange(value)}
        valueLabelDisplay="auto"
      />
      <Typography variant="caption" color="text.secondary">
        {priceRange[0] === 0 && priceRange[1] === MAX_PRICE
          ? "Any price"
          : `$${priceRange[0]} - $${priceRange[1]}`}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Minimum rating
        </Typography>
        <Slider
          value={minRating}
          min={0}
          max={5}
          step={0.1}
          onChange={(_, value) => setMinRating(value)}
          valueLabelDisplay="auto"
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="facilities-filter-label">Facilities</InputLabel>
          <Select
            labelId="facilities-filter-label"
            multiple
            value={selectedFacilities}
            onChange={(e) => setSelectedFacilities(e.target.value)}
            input={<OutlinedInput label="Facilities" />}
            renderValue={(selected) => selected.join(", ")}
          >
            {facilityOptions.map((facility) => (
              <MenuItem key={facility} value={facility}>
                <Checkbox checked={selectedFacilities.includes(facility)} />
                <ListItemText primary={facility} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <TextField
        label="Search"
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            applyTextSearch();
          }
        }}
        fullWidth
        size="small"
        sx={{ mt: 1, mb: 1 }}
      />
      <Button variant="contained" fullWidth onClick={applyTextSearch}>
        Search
      </Button>
      <Button variant="text" fullWidth onClick={handleResetFilters} sx={{ mt: 1 }}>
        Reset filters
      </Button>
    </Box>
  );
  return (
    <Box sx={commonStyles.contentContainer}>
      <Box ref={listingsTopRef} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={commonStyles.pageTitle}>
            Explore listings
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {totalResults} results
            </Typography>
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <Chip key={filter.key} size="small" label={filter.label} variant="outlined" />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No filters applied
              </Typography>
            )}
          </Stack>
        </Box>
        <Button variant="outlined" onClick={() => setFiltersOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" } }}>
          Filters
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 3 }}>
        <Box sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 96, alignSelf: "flex-start" }}>
          {filterPanel}
        </Box>
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="sort-by-label">Sort by</InputLabel>
              <Select
                labelId="sort-by-label"
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="best">Best match</MenuItem>
                <MenuItem value="rating">Highest rated</MenuItem>
                <MenuItem value="priceLow">Price: low to high</MenuItem>
                <MenuItem value="priceHigh">Price: high to low</MenuItem>
              </Select>
            </FormControl>
            {!isNativeApp && (
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
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

          {loading ? (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rounded" height={320} />
                </Grid>
              ))}
            </Grid>
          ) : visibleListings.length > 0 ? (
            <Box
              sx={(theme) => ({
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                gap: theme.spacing(3),
              })}
            >
              {visibleListings.map((prop) => (
                <Box
                  key={prop._id}
                  sx={(theme) => ({
                    flex: `1 1 calc((100% - (${theme.spacing(3)} * ${gridColumns - 1})) / ${gridColumns})`,
                    minWidth: 0,
                  })}
                >
                  <PropertyCard
                    property={prop}
                    onWishlistToggle={handleToggleWishlist}
                    isWishlisted={wishlist.includes(prop._id)}
                    showWishlist={!!user?.id}
                    layout="browseSearch"
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <NoPropertiesFound />
          )}
          {!loading && totalPages > 1 && (
            <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Drawer anchor="left" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        {filterPanel}
      </Drawer>
    </Box>
  );
}
