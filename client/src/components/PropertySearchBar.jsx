import React, { useState, useEffect } from "react";
import { TextField, Box, MenuItem, Slider, Button } from "@mui/material";

const categories = [
  "", "apartment", "condo", "house", "hostel", "flat", "villa"
];
const types = [
  { value: "", label: "Any" },
  { value: "accommodation", label: "Accommodation" },
  { value: "private", label: "Private Room" },
  { value: "bed", label: "Individual Bed" }
];

export default function PropertySearchBar({ properties, onFilter }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);

  useEffect(() => {
    if (properties.length) {
      const prices = properties.map(p => p.pricePerNight);
      setPrice([0, Math.max(...prices, 1000)]);
      setMaxPrice(Math.max(...prices, 1000));
    }
  }, [properties]);

  const handleFilter = () => {
    // Debounced, basic filter
    const term = search.trim().toLowerCase();
    onFilter(
      properties.filter(p => {
        const matchTerm =
          !term ||
          [p.title, p.address, p.category, p.type, p.description]
            .some(f => (f || "").toLowerCase().includes(term));
        const matchCat = !category || p.category === category;
        const matchType = !type || p.type === type;
        const matchPrice =
          p.pricePerNight >= price[0] && p.pricePerNight <= price[1];
        return matchTerm && matchCat && matchType && matchPrice;
      })
    );
  };

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line
  }, [search, category, type, price]);

  return (
    <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 2 }}>
      <TextField
        label="Search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ minWidth: 220 }}
      />
      <TextField
        select
        label="Category"
        value={category}
        onChange={e => setCategory(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        {categories.map(c => <MenuItem key={c} value={c}>{c || "Any"}</MenuItem>)}
      </TextField>
      <TextField
        select
        label="Type"
        value={type}
        onChange={e => setType(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        {types.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
      </TextField>
      <Box sx={{ minWidth: 250, px: 2 }}>
        <Slider
          value={price}
          min={0}
          max={maxPrice}
          onChange={(_, val) => setPrice(val)}
          valueLabelDisplay="auto"
        />
        <div>Price: ${price[0]}–${price[1]}</div>
      </Box>
      <Button onClick={handleFilter} variant="outlined">Filter</Button>
    </Box>
  );
}
