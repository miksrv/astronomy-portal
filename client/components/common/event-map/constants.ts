// Default venue coordinates (the observatory's usual stargazing field, near
// Orenburg) — matches the `events` table column defaults on the backend.
export const DEFAULT_EVENT_COORDINATES = {
    latitude: 51.8250225,
    longitude: 55.71072
}

// Thunderforest Cycle tile scheme — requires an API key (thunderforest.com).
export const TILE_LAYER_URL = `https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY}`
export const TILE_LAYER_ATTRIBUTION =
    'Maps &copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
