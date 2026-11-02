import { IconTypes } from 'simple-react-ui-kit'

/** How often the relay states are re-read while the tab is visible */
export const RELAY_POLLING_MS = 15_000

/** The lamp inside the observatory is wired to the LED flat panel relay (`LIGHT_SWITCH_NAME` on the server) */
export const LIGHT_RELAY_ID = 7

/**
 * The observatory's relay board, in the order the devices are listed. Fixed hardware, so the
 * card renders on the server (names are translated in RelayList); the API delivers only the states.
 */
export const RELAYS: Array<{ id: number; model?: string; icon: IconTypes }> = [
    { id: 0, model: 'EQ6 Pro', icon: 'Compass' },
    { id: 1, model: 'ZWO ASI 6200', icon: 'Camera' },
    { id: 2, model: 'ZWO EAF', icon: 'Tune' },
    { id: 3, icon: 'Thermometer' },
    { id: 6, icon: 'Lightning' },
    { id: 7, icon: 'Sun' }
]
