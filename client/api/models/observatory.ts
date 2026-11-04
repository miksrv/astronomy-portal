export type DeviceRole =
    'mount' | 'camera' | 'guider' | 'filter' | 'focuser' | 'roof' | 'weather' | 'watchdog' | 'other'

export interface DeviceDriver {
    name: string | null
    version: string | null
}

export interface ObservatoryDevice {
    name: string
    role: DeviceRole
    connected: boolean
    driver: DeviceDriver | null
    /** Labels of the device's INDI properties in Alert (a failed connection, a cooler or a move that failed…) */
    alerts?: string[]
}

export type TrackMode = 'sidereal' | 'solar' | 'lunar' | 'custom'

export interface ObservatoryMount {
    /** JNow, degrees */
    ra: number
    dec: number
    /** J2000, degrees: what any map is drawn with */
    raJ2000: number
    decJ2000: number
    alt: number
    az: number
    parked: boolean
    tracking: boolean
    slewing: boolean
    trackMode: TrackMode | null
    pierSide: 'east' | 'west' | null
    /** Local sidereal time, hours */
    lst: number | null
    /** The last GOTO, J2000 degrees */
    target: { ra: number; dec: number } | null
}

export type FrameType = 'light' | 'bias' | 'dark' | 'flat'

export interface ObservatoryCamera {
    temperature: number | null
    coolerOn: boolean | null
    coolerPower: number | null
    exposing: boolean
    /** Seconds */
    exposureLeft: number | null
    frameType: FrameType | null
    binning: number
    gain: number | null
    offset: number | null
    /** Pixels and micrometers */
    sensor: { width: number; height: number; pixelSize: number } | null
    /** Millimeters */
    focalLength: number | null
    aperture: number | null
    /** Degrees */
    fov: { width: number; height: number } | null
}

export interface ObservatoryGuider {
    exposing: boolean
    exposureLeft: number | null
    binning: number
}

export interface ObservatoryFilter {
    slot: number
    name: string | null
    names: string[]
    moving: boolean
}

export interface ObservatoryFocuser {
    position: number | null
    temperature: number | null
    max: number | null
    moving: boolean
}

export type RoofState = 'open' | 'closed' | 'moving' | 'unknown'

export type SafetyState = 'ok' | 'warning' | 'alert' | 'unknown'

export type SchedulerState = 'idle' | 'running' | 'paused' | 'unknown'

export interface ObservatoryWatchdog {
    armed: boolean
    /** Seconds */
    heartbeat: number | null
    triggers: string[]
    shutdown: string[]
}

/**
 * What the observatory's agent last reported. Every section may be missing or null: with
 * INDI offline only `time` and `indi` are there.
 */
export interface ObservatorySnapshot {
    time: string
    indi?: { online: boolean; profile: string | null }
    devices?: ObservatoryDevice[]
    mount?: ObservatoryMount | null
    camera?: ObservatoryCamera | null
    guider?: ObservatoryGuider | null
    filter?: ObservatoryFilter | null
    focuser?: ObservatoryFocuser | null
    roof?: { state: RoofState; parked: boolean | null } | null
    weather?: { state: SafetyState; parameters: Record<string, number> } | null
    watchdog?: ObservatoryWatchdog | null
    scheduler?: { state: SchedulerState; job: string | null } | null
}

export interface ObservatoryEvent {
    id: number
    type: string
    device: string | null
    /** ISO, UTC */
    time: string
}
