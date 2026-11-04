import { ApiModel } from '@/api'

import {
    DATA_ROLES,
    DEVICE_ROLE_ORDER,
    MAP_FIELDS_ACROSS,
    MAP_ZOOM_DEFAULT,
    MAP_ZOOM_MAX,
    MAP_ZOOM_MIN
} from './constants'

export type MountState = 'slewing' | 'parked' | 'tracking' | 'idle'

/** What the mount is doing; slewing outranks the rest, a parked mount does not track */
export const getMountState = (mount: ApiModel.ObservatoryMount): MountState =>
    mount.slewing ? 'slewing' : mount.parked ? 'parked' : mount.tracking ? 'tracking' : 'idle'

/** Whole minutes between two moments; never negative */
export const getMinutesAgo = (iso: string | null | undefined, now?: Date): number | undefined => {
    if (!iso || !now) {
        return undefined
    }

    const time = new Date(iso).getTime()

    return Number.isNaN(time) ? undefined : Math.max(0, Math.floor((now.getTime() - time) / 60_000))
}

/** A countdown as m:ss (or h:mm:ss): short enough for a badge */
export const formatCountdown = (seconds: number): string => {
    const total = Math.max(0, Math.round(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = String(total % 60).padStart(2, '0')

    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** A reading that may be absent: a number or nothing */
export const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** One card of the dashboard: a device and the section of the snapshot that describes it */
export interface DeviceCardItem {
    key: string
    role: ApiModel.DeviceRole
    name: string | null
    connected: boolean
    driver: ApiModel.DeviceDriver | null
    /** INDI properties of the device in Alert */
    alerts: string[]
    /** The snapshot has this role's section, so the card has something to show */
    hasData: boolean
}

const hasSection = (snapshot: ApiModel.ObservatorySnapshot, role: ApiModel.DeviceRole): boolean =>
    DATA_ROLES.includes(role) && !!snapshot[role as keyof ApiModel.ObservatorySnapshot]

/**
 * The cards to show, in a stable order. Every device the agent lists gets one; a section the
 * agent reports without listing its device (an older agent) gets a card too. Of several devices
 * of one role only the first owns the section's data: the rest are shown by name.
 */
export const buildDeviceCards = (snapshot: ApiModel.ObservatorySnapshot): DeviceCardItem[] => {
    const cards: DeviceCardItem[] = []
    const withData = new Set<ApiModel.DeviceRole>()

    for (const device of snapshot.devices ?? []) {
        const owns = !withData.has(device.role) && hasSection(snapshot, device.role)

        if (owns) {
            withData.add(device.role)
        }

        cards.push({
            key: `${device.role}-${device.name}`,
            role: device.role,
            name: device.name,
            connected: device.connected,
            driver: device.driver ?? null,
            alerts: device.alerts ?? [],
            hasData: owns
        })
    }

    for (const role of DATA_ROLES) {
        if (!withData.has(role) && hasSection(snapshot, role) && !cards.some((card) => card.role === role)) {
            cards.push({ key: role, role, name: null, connected: true, driver: null, alerts: [], hasData: true })
        }
    }

    const rank = (role: ApiModel.DeviceRole) => {
        const index = DEVICE_ROLE_ORDER.indexOf(role)

        return index === -1 ? DEVICE_ROLE_ORDER.length : index
    }

    // Array.sort is stable: devices of one role keep the agent's order
    return cards.sort((a, b) => rank(a.role) - rank(b.role))
}

export type DeviceHealth = 'ok' | 'warning' | 'error'

/**
 * A device listed in the profile but not connected is an error (red); a connected one with INDI
 * properties in Alert is a warning (orange); otherwise it is fine (green)
 */
export const getDeviceHealth = (connected: boolean, alerts?: string[] | null): DeviceHealth =>
    !connected ? 'error' : alerts?.length ? 'warning' : 'ok'

/** "EQMod Mount v1.4", the version only when it is known; undefined without a driver */
export const formatDriver = (driver: ApiModel.DeviceDriver | null | undefined): string | undefined => {
    if (!driver || (!driver.name && !driver.version)) {
        return undefined
    }

    return [driver.name, driver.version ? `v${driver.version}` : null].filter(Boolean).join(' ')
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Hours as "23:33:04" (the local sidereal time); undefined for a missing value */
export const formatSiderealTime = (hours: number | null | undefined): string | undefined => {
    if (!isNumber(hours)) {
        return undefined
    }

    const total = Math.round((((hours % 24) + 24) % 24) * 3600) % 86_400

    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

/** A share in percent, within 0..100; 0 for a missing or nonsensical pair */
export const getPercent = (value: number | null | undefined, max: number | null | undefined): number => {
    if (!isNumber(value) || !isNumber(max) || max <= 0) {
        return 0
    }

    return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

/** "9576 × 6388" */
export const formatSize = (width: number, height: number): string => `${width} × ${height}`

/** The optics in the usual short form: focal length × aperture, "F1000x200" */
export const formatOptics = (focalLength?: number | null, aperture?: number | null): string =>
    `F${isNumber(focalLength) ? Math.round(focalLength) : '?'}x${isNumber(aperture) ? Math.round(aperture) : '?'}`

/** The field of view in degrees, "2.06° × 1.38°" */
export const formatFov = (fov: { width: number; height: number }, locale: string): string => {
    const format = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 })

    return `${format(fov.width)}° × ${format(fov.height)}°`
}

/** The zoom of the mini map: about ten fields of view across, within the map's limits */
export const getMapZoom = (fov: { width: number; height: number } | null | undefined): number => {
    const field = fov ? Math.max(fov.width, fov.height) : 0

    if (!(field > 0)) {
        return MAP_ZOOM_DEFAULT
    }

    // The map is 360 degrees wide at zoom 1
    const zoom = 360 / (field * MAP_FIELDS_ACROSS)

    return Math.round(Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, zoom)))
}

/** The map is centered on a whole-degree grid: a tracking mount does not rebuild it */
export const getMapCenter = (mount: ApiModel.ObservatoryMount): [number, number] | undefined =>
    isNumber(mount.raJ2000) && isNumber(mount.decJ2000)
        ? [Math.round(mount.raJ2000 / 2) * 2, Math.round(mount.decJ2000 / 2) * 2]
        : undefined
