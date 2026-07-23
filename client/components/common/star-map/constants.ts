import { FONT } from './config'
import { StarMapSettings } from './types'

export const POINT_RADIUS = 5
export const POPUP_WIDTH = 200
export const POPUP_HEIGHT = 180
export const POPUP_OFFSET = 10
// Half-width/height of the border-triangle arrow that connects the popup to its marker.
export const POPUP_ARROW_SIZE = 8
// Minimum distance (px) the arrow tip is kept from the popup's left/right edges, so it
// never renders over the popup's rounded corners even when the popup itself had to shift
// away from centering on the marker to stay within the container.
export const POPUP_ARROW_MARGIN = 16

export const STARMAP_STORAGE_KEY = 'astro_starmap_settings'

export const MOBILE_MAX_WIDTH = 768

export const DEFAULT_STARMAP_SETTINGS: StarMapSettings = {
    starsShow: true,
    starsLimit: 6,
    dsosShow: false,
    customObjectsShow: true,
    constellationNames: true,
    constellationLines: true,
    constellationBounds: false,
    graticule: true,
    equatorial: false,
    ecliptic: false,
    galactic: false,
    milkyWay: true,
    planetsShow: true,
    center: [0, 20, 0]
}

export const STARS_LIMIT_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
    key: i + 1,
    value: String(i + 1)
}))

export const stylePoint = {
    fill: 'rgba(252,130,130,0.4)',
    stroke: '#ff0000',
    width: 1
}

export const styleText = {
    align: 'left',
    baseline: 'bottom',
    fill: '#ff0000',
    font: `12px ${FONT}`
}
