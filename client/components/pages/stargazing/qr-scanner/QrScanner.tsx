import React from 'react'

import dynamic from 'next/dynamic'

import type { QrScannerRenderProps } from './QrScannerRender'

// html5-qrcode drives the device camera via `navigator.mediaDevices`, so - like
// EventMap/StarMap - it can't be part of the server-rendered bundle.
const QrScannerRender = dynamic(() => import('./QrScannerRender'), {
    ssr: false
})

export type QrScannerProps = QrScannerRenderProps

export const QrScanner: React.FC<QrScannerProps> = (props) => <QrScannerRender {...props} />
