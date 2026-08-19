import React, { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

export interface QrScannerRenderProps {
    onScanSuccess: (decodedText: string) => void
    onScanFailure: (message: string) => void
}

/**
 * Camera QR scanner backed by `html5-qrcode`. Only ever rendered on the
 * client (see `QrScanner.tsx`) - `Html5Qrcode` talks to `navigator.mediaDevices`
 * at call time, so it can't be part of the server-rendered bundle.
 */
export const QrScannerRender: React.FC<QrScannerRenderProps> = ({ onScanSuccess, onScanFailure }) => {
    const { t } = useTranslation()

    const scannerRef = useRef<Html5Qrcode | null>(null)

    useEffect(() => {
        let cancelled = false

        const stopScanner = async () => {
            const scanner = scannerRef.current

            if (scanner) {
                scannerRef.current = null

                try {
                    await scanner.stop()
                    scanner.clear()
                } catch {
                    // Scanner may already be stopped (e.g. camera permission revoked mid-scan).
                }
            }
        }

        const handleScan = async (decodedText: string) => {
            await stopScanner()
            onScanSuccess(decodedText)
        }

        const startScanner = async () => {
            const scanner = new Html5Qrcode('qr-reader')
            scannerRef.current = scanner

            const cameras = await Html5Qrcode.getCameras()

            if (cancelled) {
                return
            }

            if (!cameras || !cameras.length) {
                onScanFailure(t('pages.checkin.no-cameras', 'Камеры не найдены'))

                return
            }

            await scanner.start(cameras[0].id, { fps: 10, qrbox: 250 }, handleScan, () => {})
        }

        startScanner().catch((err: Error) => {
            if (!cancelled) {
                onScanFailure(err.message)
            }
        })

        return () => {
            cancelled = true
            void stopScanner()
        }
    }, [])

    return (
        <div
            id={'qr-reader'}
            className={'qrCodeScanner'}
        >
            <Spinner />
        </div>
    )
}

export default QrScannerRender
