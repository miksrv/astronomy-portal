import React from 'react'
import { Skeleton } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'

import type { EventMapRenderProps } from './EventMapRender'

import styles from './styles.module.sass'

// Leaflet touches `window`/`document` at import time, so it can't be part of
// the server-rendered bundle.
const EventMapRender = dynamic(() => import('./EventMapRender'), {
    ssr: false,
    // Without this, nothing renders in the map's spot until the client-only
    // bundle loads — `.mapContainer`'s `min-height` (see styles.module.sass)
    // reserves the space, this just fills it in the meantime.
    loading: () => <Skeleton className={styles.mapContainer} />
})

export type EventMapProps = EventMapRenderProps

export const EventMap: React.FC<EventMapProps> = (props) => <EventMapRender {...props} />
