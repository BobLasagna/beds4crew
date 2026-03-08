import React from "react";
import { Card, CardMedia, CardContent, Typography, Chip, IconButton, Box, Avatar, CardActions, Button, Tooltip } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate } from "react-router-dom";
import { formatPriceDisplay } from "../utils/api";
import RatingStars from "./RatingStars";
import { commonStyles, CARD_IMAGE_HEIGHT } from "../utils/styleConstants";
import { formatImageUrl, getListingMetrics } from "../utils/helpers";

export default function PropertyCard({ 
  property, 
  onWishlistToggle, 
  isWishlisted, 
  showStatus = false,
  showRoomCount = false,
  showDelete = false,
  onDelete,
  showWishlist = true,
  layout = "default",
  onCardClick,
  onViewDetails
}) {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) return;
    navigate(`/property/${property._id}`);
  };

  const metrics = getListingMetrics(property);
  const hasRating = typeof metrics.rating === "number" && typeof metrics.reviews === "number";
  const isBrowseStandard = layout === "browseSearch";

  if (isBrowseStandard) {
    return (
      <Card
        sx={{ display: "flex", flexDirection: "column", height: "100%", cursor: "pointer" }}
        onClick={(e) => {
          if (onCardClick) {
            onCardClick(property, e);
            return;
          }
          handleCardClick(e);
        }}
      >
        <CardMedia
          component="img"
          height="180"
          loading="lazy"
          image={
            property.images?.[0]
              ? formatImageUrl(property.images[0].path || property.images[0])
              : "https://picsum.photos/300/180?random=1"
          }
          alt={property.title}
        />
        <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
          <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar
                sx={{ width: 32, height: 32, fontSize: 14 }}
                src={property.ownerHost?.profileImagePath || ""}
                alt={property.ownerHost?.firstName || "Host"}
              >
                {property.ownerHost?.firstName?.[0] || "H"}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {property.ownerHost?.firstName
                  ? `${property.ownerHost.firstName} ${property.ownerHost.lastName || ""}`
                  : "Verified Host"}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {property.city}, {property.country}
            </Typography>
          </Box>
        </CardContent>

        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" noWrap title={property.title}>
            {property.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {property.address}
          </Typography>
          {hasRating && <RatingStars value={metrics.rating} count={metrics.reviews} />}
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
            {property.lowestPrice ? `$${property.lowestPrice}/night` : formatPriceDisplay(property)}
          </Typography>
          {property.availableBeds !== undefined && (
            <Typography variant="body2" color="primary.main" sx={{ mt: 0.5, fontWeight: 600 }}>
              {property.availableBeds} {property.availableBeds === 1 ? "bed" : "beds"} available
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {property.category} • {property.type}
          </Typography>
          {!property.latitude || !property.longitude ? (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
              Map pin unavailable
            </Typography>
          ) : null}
        </CardContent>

        <CardActions sx={{ pt: 0 }}>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) {
                onViewDetails(property, e);
                return;
              }
              navigate(`/property/${property._id}`);
            }}
          >
            View Details
          </Button>
          {showWishlist && onWishlistToggle && (
            <Tooltip title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onWishlistToggle(property._id);
                }}
                color={isWishlisted ? "error" : "default"}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                {isWishlisted ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      </Card>
    );
  }

  return (
    <Card sx={{ ...commonStyles.card, cursor: "pointer", overflow: "hidden" }} onClick={handleCardClick}>
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height={CARD_IMAGE_HEIGHT.large}
          loading="lazy"
          image={
            property.images?.[0]
              ? formatImageUrl(property.images[0].path || property.images[0])
              : "https://picsum.photos/400/300?random=1"
          }
          alt={property.title}
          sx={{ objectFit: "cover" }}
        />
        {metrics.hasPaid && (
          <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
            <Chip
              label="Verified"
              size="small"
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
        {showWishlist && onWishlistToggle && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle(property._id);
            }}
            sx={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(255,255,255,0.9)" }}
            color={isWishlisted ? "error" : "default"}
            aria-label={isWishlisted ? "Remove from favorites" : "Save to favorites"}
          >
            {isWishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            sx={{ width: 28, height: 28, fontSize: 12 }}
            src={property.ownerHost?.profileImagePath || ""}
            alt={property.ownerHost?.firstName || "Host"}
          >
            {property.ownerHost?.firstName?.[0] || "H"}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {property.ownerHost?.firstName ? `${property.ownerHost.firstName} ${property.ownerHost.lastName || ""}` : "Verified Host"}
          </Typography>
          {showStatus && (
            <Chip
              label={property.status == "active" ? "Active" : "Inactive"}
              color={property.status == "active" ? "success" : "default"}
              size="small"
              sx={{ ml: "auto" }}
            />
          )}
        </Box>
        {showStatus && property.status === "inactive" && property.inactiveReason === "listing_limit" && (
          <Chip
            label="Inactive (limit reached)"
            color="warning"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          />
        )}
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{
            fontWeight: 600,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 48,
          }}
        >
          {property.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {property.city}, {property.country}
        </Typography>
        {hasRating && <RatingStars value={metrics.rating} count={metrics.reviews} />}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatPriceDisplay(property)}
          </Typography>
          {showRoomCount && (
            <Typography variant="caption" color="text.secondary">
              {property.rooms?.length || 0} room{property.rooms?.length !== 1 ? "s" : ""}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
