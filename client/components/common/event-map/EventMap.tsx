import React from 'react'

import dynamic from 'next/dynamic'

import type { EventMapRenderProps } from './EventMapRender'

// Leaflet touches `window`/`document` at import time, so it can't be part of
// the server-rendered bundle.
const EventMapRender = dynamic(() => import('./EventMapRender'), {
    ssr: false
})

export type EventMapProps = EventMapRenderProps

export const EventMap: React.FC<EventMapProps> = (props) => <EventMapRender {...props} />
