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

export type PopupState = {
    visible: boolean
    x: number
    y: number
    object?: string
    name?: string
}

export type PendingPopup = {
    name: string
    object: string
    ra: number
    dec: number
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
