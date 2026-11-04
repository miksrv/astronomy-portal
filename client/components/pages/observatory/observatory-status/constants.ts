import { IconTypes } from 'simple-react-ui-kit'

import { ApiModel } from '@/api'

/** The order of the device cards: the telescope first, then what it shoots with, then the shelter */
export const DEVICE_ROLE_ORDER: ApiModel.DeviceRole[] = [
    'mount',
    'camera',
    'guider',
    'filter',
    'focuser',
    'roof',
    'watchdog',
    'weather',
    'other'
]

export const DEVICE_ROLE_ICONS: Record<ApiModel.DeviceRole, IconTypes> = {
    mount: 'Compass',
    camera: 'Camera',
    guider: 'Position',
    filter: 'Layers',
    focuser: 'Tune',
    roof: 'Exit',
    weather: 'Cloud',
    watchdog: 'Eye',
    other: 'Settings'
}

/** The roles that have a card with the device's data; the rest show the name and the connection only */
export const DATA_ROLES: ApiModel.DeviceRole[] = ['mount', 'camera', 'guider', 'filter', 'focuser', 'roof', 'watchdog']

/** The camera's FOV is a couple of degrees: zoom the mini map so that it is a visible rectangle */
export const MAP_ZOOM_MIN = 8
export const MAP_ZOOM_MAX = 24
/** The mini map shows about this many fields of view across */
export const MAP_FIELDS_ACROSS = 10
/** Without a camera FOV the map is zoomed to this level */
export const MAP_ZOOM_DEFAULT = 14

/** The mini map has no controls and does not take the page's touch scrolling away */
export const MAP_CONFIG = {
    controls: false,
    interactive: false,
    zoomextend: MAP_ZOOM_MAX
}

/** Frame types as astrophotographers call them, untranslated */
export const FRAME_TYPE_LABELS: Record<ApiModel.FrameType, string> = {
    light: 'Light',
    bias: 'Bias',
    dark: 'Dark',
    flat: 'Flat'
}
