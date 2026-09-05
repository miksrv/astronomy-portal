export type GeoJSONFeature = {
    type: 'Feature'
    id: string
    properties: {
        name: string
        mag: number
        dim: number
    }
    geometry: {
        type: string
        coordinates: [number, number]
    }
}

export type GeoJSON = {
    type: 'FeatureCollection'
    features: GeoJSONFeature[]
}

/** Whether the popup sits below the marker (arrow points up) or above it (arrow points down). */
export type PopupPlacement = 'below' | 'above'

/** Marker position in #celestial-map coordinates — the popup and its arrow are laid out around it. */
export type PopupAnchor = {
    x: number
    y: number
}

export type PopupState = {
    visible: boolean
    anchor: PopupAnchor
    x: number
    y: number
    /** Horizontal offset (px) of the arrow tip from the popup's left edge. */
    arrowOffset: number
    placement: PopupPlacement
    /** Popup box height as measured after render — the info variant is auto-height */
    height: number
    /**
     * False until the rendered popup has been measured and x/y/arrowOffset/placement
     * recomputed for its real size; the popup is only shown once this is true, so the
     * first paint already lands in the right place.
     */
    positioned: boolean
    /** Portal object id — the popup shows the photo + link (original behavior) */
    object?: string
    name?: string
    /** Astronomy info panel content (FE-8) — set instead of `object` for built-in objects */
    info?: import('./objectInfo').ObjectInfoData
    /** The moment `info` was computed for */
    infoDate?: Date
}

export type PendingPopup = {
    name: string
    /** Portal object id; empty for info-panel popups */
    object: string
    ra: number
    dec: number
    info?: import('./objectInfo').ObjectInfoData
    infoDate?: Date
}

export type SkyPoint = {
    geometry: { coordinates: string }
    properties: { name: string }
}

export type HitResult = {
    coords: number[]
    point: {
        id: string
        geometry: { coordinates: [number, number] }
        properties: { name: string }
    }
}

/** 'sky' — today's flat equatorial chart; 'horizon' — local-sky planetarium view */
export type StarMapViewMode = 'sky' | 'horizon'

export type StarMapSettings = {
    viewMode: StarMapViewMode
    /**
     * Horizon mode only: draw the daylight/twilight sky gradient (Celestial's `daylight`).
     * Off = stars on a dark dome even by day — the "atmosphere" switch in Stellarium terms.
     */
    atmosphere: boolean
    starsShow: boolean
    starsLimit: number
    dsosShow: boolean
    /** Swap the curated dsos.bright.json for the full dsos.6.json catalog (lazy-fetched) */
    dsosFull: boolean
    customObjectsShow: boolean
    meteorShowersShow: boolean
    constellationNames: boolean
    constellationLines: boolean
    constellationBounds: boolean
    graticule: boolean
    equatorial: boolean
    ecliptic: boolean
    galactic: boolean
    milkyWay: boolean
    planetsShow: boolean
    center: [number, number, number]
    /** Observer position [lat, lon] in degrees — persisted, unlike the selected date */
    geopos: [number, number]
}
