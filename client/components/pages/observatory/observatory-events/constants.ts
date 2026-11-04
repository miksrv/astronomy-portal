import { IconTypes } from 'simple-react-ui-kit'

export type EventTone = 'alert' | 'ok' | 'info' | 'neutral'

export interface EventMeta {
    icon: IconTypes
    tone: EventTone
    /** The device named in the event says nothing the text does not: it is left out */
    deviceImplied?: boolean
}

/** How each event type looks: alerts are red, "all clear" is green, the equipment's moves are neutral */
export const EVENT_META: Record<string, EventMeta> = {
    indi_online: { icon: 'Lightning', tone: 'ok', deviceImplied: true },
    indi_offline: { icon: 'Lightning', tone: 'neutral', deviceImplied: true },
    roof_opened: { icon: 'Exit', tone: 'info', deviceImplied: true },
    roof_closed: { icon: 'Exit', tone: 'neutral', deviceImplied: true },
    mount_parked: { icon: 'Compass', tone: 'neutral', deviceImplied: true },
    mount_unparked: { icon: 'Compass', tone: 'info', deviceImplied: true },
    weather_alert: { icon: 'ReportError', tone: 'alert', deviceImplied: true },
    weather_ok: { icon: 'CheckCircle', tone: 'ok', deviceImplied: true },
    job_started: { icon: 'Camera', tone: 'info' },
    job_finished: { icon: 'Camera', tone: 'ok' },
    agent_started: { icon: 'Settings', tone: 'neutral', deviceImplied: true }
}

/** What a type the front end does not know yet (a newer agent) looks like */
export const FALLBACK_EVENT_META: EventMeta = { icon: 'Feed', tone: 'neutral' }

/** Events shown at first, and how many more every "Show more" adds */
export const INITIAL_COUNT = 12
export const MORE_COUNT = 10
