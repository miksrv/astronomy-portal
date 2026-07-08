const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

/**
 * Reverse-geocodes coordinates into a human-readable address via OpenStreetMap's
 * Nominatim. Client-side, unauthenticated — fine for the low-volume admin form
 * this is used from; do not call this in a hot path or a loop.
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number,
    locale: string = 'ru'
): Promise<string | undefined> => {
    const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
        'accept-language': locale
    })

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`)

    if (!response.ok) {
        return undefined
    }

    const data = await response.json()

    return typeof data?.display_name === 'string' ? data.display_name : undefined
}
