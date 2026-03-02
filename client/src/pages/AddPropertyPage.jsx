import React, { useState, useEffect } from "react";
import { TextField, Button, IconButton, InputAdornment, Box, MenuItem, Typography, Chip, CircularProgress, Alert, Dialog, DialogContent, Backdrop, Stepper, Step, StepLabel } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import LocationPicker from "../components/LocationPicker";
import RoomBedsConfigurator from "../components/RoomBedsConfigurator";
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchWithAuth, API_URL } from "../utils/api";

async function reverseGeocode([lat, lng]) {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;

  const res = await fetch(url);

  const data = await res.json();

  if (!data || !data.features || data.features.length === 0) {
    console.log("No address features data found");
    return {};
  }
  
  const props = data.features[0].properties;
  
  // Extract city with fallbacks
  const city = props.city || props.town || props.village || props.county || props.state || "";
  
  // Extract country
  const country = props.country || "";
  
  // Extract address with fallbacks
  const address = props.name || props.street || props.housenumber 
    ? `${props.housenumber || ''} ${props.street || props.name || ''}`.trim()
    : props.display_name || "";
  
  console.log('Reverse geocode result:', { city, country, address, rawProps: props });
  
  return { city, country, address };
}

const categories = ["apartment", "condo", "house", "hostel", "flat", "villa"];
const types = [
  { value: "accommodation", label: "Accommodation" },
  { value: "private", label: "Private Room" },
  { value: "bed", label: "Individual Bed" }
];
const suggestedFacilities = ["AC", "BBQ", "Laundry", "WiFi", "Kitchen", "Parking", "Pool", "TV", "Workspace"];
const formSteps = ["Location", "Type & Rooms", "Details", "Photos"];

export default function AddPropertyPage() {
  const [form, setForm] = useState({
    title: "", type: "", category: "", description: "",
    pricePerNight: "", city: "", country:"", maxGuests: "",
    facilities: [], images: [], address: "", rooms: []
  });
  const [error, setError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [facilityInput, setFacilityInput] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  useEffect(() => {
    const fetchAddress = async () => {
      setAddressLoading(true);
      if (form.position && form.position.length === 2) {
        try {
          const { city, country, address } = await reverseGeocode(form.position);
          setForm(prev => ({
              ...prev,
              address: address,
              city: city || prev.city,
              country: country || prev.country,
            }));
            // console.log('Reverse geocoded address:', address, city, country);
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
          }
        }
        setAddressLoading(false);
    };

    fetchAddress();
  }, [form.position]);

  const handleInputChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function handleLocationChange(latlng) {
    setAddressError("");
    setError("");
    setForm((prev) => ({ ...prev, position: latlng }));
  };

  const handleFacilities = (e) => {
    if (e.key === "Enter" && facilityInput) {
      setForm(prev => ({ ...prev, facilities: [...prev.facilities, facilityInput] }));
      setFacilityInput("");
      e.preventDefault();
    }
  };

  const handleFacilityDelete = (chipToDelete) => {
    setForm(prev => ({
      ...prev, facilities: prev.facilities.filter(f => f !== chipToDelete)
    }));
  };

  const handleSuggestedFacility = (facility) => {
    if (!form.facilities.includes(facility)) {
      setForm(prev => ({ ...prev, facilities: [...prev.facilities, facility] }));
    }
  };

  const handleImageChange = (e) => {
    const MAX_IMAGES = 6;
    const newFiles = Array.from(e.target.files);
    const currentImageCount = form.images.length;
    const availableSlots = MAX_IMAGES - currentImageCount;
    
    if (availableSlots <= 0) {
      snackbar(`You have reached the maximum of ${MAX_IMAGES} images.`, "warning");
      return;
    }
    
    if (newFiles.length > availableSlots) {
      snackbar(`Only ${availableSlots} more image(s) can be added. Uploading ${availableSlots} of ${newFiles.length} selected.`, "warning");
      newFiles.splice(availableSlots);
    }
    
    const combinedImages = [...form.images, ...newFiles];
    setForm({ ...form, images: combinedImages });
    setImagePreviews([...imagePreviews, ...newFiles.map(file => URL.createObjectURL(file))]);
  };

  const handleImageRemove = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e) => {
    // Only prevent Enter on single-line fields (not multiline textareas)
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }

  const handleRoomsChange = (newRooms) => {
    setError("");
    setForm({ ...form, rooms: newRooms });
  };

  const handleSimplePriceChange = (price) => {
    setForm({ ...form, pricePerNight: price });
  };

  const getStepValidationError = (stepIndex) => {
    if (stepIndex === 0) {
      if (!form.address || !form.position) return "Please select a location on the map.";
      if (!form.city || !form.country) return "City and country information is required. Please select location again.";
      return "";
    }

    if (stepIndex === 1) {
      if (!form.type) return "Please select a property type.";
      if (!form.category) return "Please select a category.";
      if (form.rooms.length === 0) return "Please add at least one room with beds.";
      return "";
    }

    if (stepIndex === 2) {
      if (!form.title) return "Please enter a title.";
      if (!form.description) return "Please enter a description.";
      if (form.type === "accommodation" && !form.maxGuests) {
        return "Max guests is required for whole home listings.";
      }
      return "";
    }

    if (stepIndex === 3) {
      if (form.images.length === 0) return "Please upload at least one photo before finalizing.";
      return "";
    }

    return "";
  };

  const handleNextStep = () => {
    const stepError = getStepValidationError(activeStep);
    if (stepError) {
      if (activeStep === 0) {
        setAddressError(stepError);
      } else {
        setError(stepError);
      }
      snackbar(stepError, "warning");
      return;
    }

    setError("");
    setAddressError("");
    if (activeStep < formSteps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAddressError("");

    if (!form.address || !form.position) {
      setAddressError("Please select a location on the map.");
      setActiveStep(0);
      return;
    }
    if (!form.type) {
      setError("Please select a property type.");
      setActiveStep(1);
      return;
    }
    if (!form.title || !form.description) {
      setError("Title and description are required.");
      setActiveStep(2);
      return;
    }
    if (form.type === "accommodation" && !form.maxGuests) {
      setError("Max guests is required for whole home listings.");
      setActiveStep(2);
      return;
    }
    if (form.rooms.length === 0) {
      setError("Please add at least one room with beds to activate your property.");
      setActiveStep(1);
      return;
    }
    
    // Validate city and country are present
    if (!form.city || !form.country) {
      setError("City and country information is required. Please try selecting a different location on the map.");
      setActiveStep(0);
      return;
    }

    if (form.images.length === 0) {
      setError("Please upload at least one photo before finalizing.");
      setActiveStep(3);
      return;
    }
    
    setAddressError("");
    setSubmitting(true);
    const data = new FormData();
    
    // Debug: Log what we're sending
    console.log("Form data being sent:", {
      title: form.title,
      type: form.type,
      category: form.category,
      description: form.description,
      pricePerNight: form.pricePerNight,
      city: form.city,
      country: form.country,
      address: form.address,
      maxGuests: form.maxGuests,
      facilities: form.facilities,
      rooms: form.rooms,
      imageCount: form.images.length
    });
    
    Object.entries(form).forEach(([key, val]) => {
      if (key === "images") for (let file of val) data.append("images", file);
      else if (key === "facilities") data.append("facilities", val.join(","));
      else if (key === "rooms") data.append("rooms", JSON.stringify(val));
      else if (key !== "position") data.append(key, val);
    });

    try {
      const res = await fetchWithAuth(`${API_URL}/properties`, {
        method: "POST",
        body: data
      });
      
      // Try to get error message from response
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(errorData.message || "Failed to save property");
      }

      const responseData = await res.json().catch(() => null);

      if (responseData?.limitReached) {
        snackbar(
          responseData.message || "You have reached your listing limit. Property was saved as inactive.",
          "warning"
        );
      } else {
        snackbar("Property added successfully");
      }
      
      navigate("/");
    } catch (err) {
      console.error("Error creating property:", err);
      snackbar("Failed to save property", "error");
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", p: 3 }}>
      <Typography variant="h5" mb={2}>Add New Property</Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {formSteps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} encType="multipart/form-data">
        {activeStep === 0 && (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                📋 Complete Basic Info & Configure Rooms
              </Typography>
              <Typography variant="body2">
                You can add more details like specific pricing per bed, max guests, and additional amenities after configuring your property. Once you add at least one room with beds, your property will be activated and visible to guests.
              </Typography>
            </Alert>

            <TextField
              label="Approximate Address"
              placeholder="Please select location on map"
              name="address"
              fullWidth
              required
              margin="normal"
              value={addressLoading ? 'Loading...' : (form.address || '')}
              disabled={addressLoading}
              error={!!addressError}
              helperText={addressError}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (addressLoading ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : (form.address &&
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setForm(prev => ({
                          ...prev, address: "", position: null
                        }))}
                        edge="end"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )),
                },
              }}
            />

            <div id="address" label="Address">
              <LocationPicker value={form.position} onChange={handleLocationChange} />
            </div>
          </>
        )}

        {activeStep === 1 && (
          <>
            <TextField
              select
              label="Type"
              name="type"
              fullWidth
              required
              margin="normal"
              value={form.type}
              onChange={handleInputChange}
              helperText={
                form.type === "accommodation" ? "Entire home - Configure multiple rooms and beds, pricing per night"
                  : form.type === "private" ? "Single private room - Only 1 room with configurable beds"
                    : form.type === "bed" ? "Individual bed - Only 1 room with 1 bed"
                      : "Select a type to get started"
              }
            >
              {types.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>

            <TextField select label="Category" name="category" fullWidth margin="normal" value={form.category} onChange={handleInputChange}>
              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            <RoomBedsConfigurator
              rooms={form.rooms}
              onChange={handleRoomsChange}
              propertyType={form.type}
              simplePrice={form.pricePerNight}
              onSimplePriceChange={handleSimplePriceChange}
            />
          </>
        )}

        {activeStep === 2 && (
          <>
            <TextField label="Title" placeholder="Private Room / Bunk Bed" name="title" fullWidth required margin="normal" value={form.title} onChange={handleInputChange} />
            <TextField label="Description" name="description" fullWidth required multiline rows={3} margin="normal" value={form.description} onChange={handleInputChange} />
            <TextField label="Price per Night (optional for now)" name="pricePerNight" fullWidth margin="normal" type="number" value={form.pricePerNight} onChange={handleInputChange} inputProps={{ placeholder: "Can be updated later" }} />
            <TextField label="Max Guests" name="maxGuests" fullWidth margin="normal" type="number" value={form.maxGuests} onChange={handleInputChange} inputProps={{ placeholder: "Can be updated later" }} required={form.type === "accommodation"} helperText={form.type === "accommodation" ? "Required for whole home listings" : "Optional for now"} />

            <Box mt={2} mb={2}>
              <TextField
                label="Add Facility"
                value={facilityInput}
                onChange={e => setFacilityInput(e.target.value)}
                onKeyDown={handleFacilities}
                helperText="Press Enter to add or select from suggestions below"
                fullWidth
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 1, color: 'text.secondary' }}>
                Quick suggestions:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {suggestedFacilities.map(facility => (
                  <Chip
                    label={facility}
                    onClick={() => handleSuggestedFacility(facility)}
                    variant="outlined"
                    key={facility}
                    clickable
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                  />
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                Selected facilities:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {form.facilities.map(facility => (
                  <Chip label={facility} onDelete={() => handleFacilityDelete(facility)} key={facility} />
                ))}
              </Box>
            </Box>
          </>
        )}

        {activeStep === 3 && (
          <>
            <Button variant="contained" component="label" fullWidth sx={{ my: 2 }}>
              Upload Images (up to 6)
              <input type="file" name="images" accept="image/*" multiple hidden onChange={handleImageChange} />
            </Button>
            <Box display="flex" flexWrap="wrap" mb={2}>
              {imagePreviews.map((src, idx) => (
                <Box key={idx} sx={{ mr: 2, position: 'relative' }}>
                  <img src={src} alt={`preview-${idx}`} width={80} height={60} style={{ objectFit: "cover", borderRadius: 8 }} />
                  <IconButton
                    onClick={() => handleImageRemove(idx)}
                    sx={{ position: 'absolute', top: 0, right: 0, color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={handlePreviousStep} disabled={activeStep === 0} sx={{ minWidth: 120 }}>
            Back
          </Button>
          {activeStep < formSteps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNextStep}
              fullWidth
              disabled={Boolean(getStepValidationError(activeStep))}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting}>
              Add Property
            </Button>
          )}
        </Box>

        {error && <Typography color="error" mt={2}>{error}</Typography>}
      </form>

      {/* Submitting Dialog */}
      <Dialog 
        open={submitting} 
        disableEscapeKeyDown
        PaperProps={{
          sx: { borderRadius: 3, p: 3, minWidth: 300 }
        }}
        BackdropComponent={Backdrop}
        BackdropProps={{
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
        }}
      >
        <DialogContent sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Creating Your Property
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we save your listing...
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
