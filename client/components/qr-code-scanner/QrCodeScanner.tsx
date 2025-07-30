'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const QrCodeScanner = () => {
    const [scannedResult, setScannedResult] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const divId = 'qr-reader'

    const startScanner = async () => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(divId)
        }

        const cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length) {
            const cameraId = cameras[0].id

            await scannerRef.current.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: 250
                },
                (decodedText) => {
                    setScannedResult(decodedText)
                    void scannerRef.current?.stop().then(() => {
                        console.warn('Scanning stopped.')
                    })
                },
                (errorMessage) => {
                    console.warn('QR scan error:', errorMessage)
                }
            )
        }
    }

    useEffect(() => {
        return () => {
            scannerRef.current?.stop().catch(() => {})
        }
    }, [])

    return (
        <div className='p-4'>
            <button
                onClick={startScanner}
                className='bg-blue-500 text-white p-2 rounded'
            >
                Открыть камеру
            </button>
            <div
                id={divId}
                style={{ width: '100%', marginTop: '20px' }}
            ></div>
            {scannedResult && <div className='mt-4 text-green-700 font-bold'>📦 Результат QR: {scannedResult}</div>}
        </div>
    )
}

export default QrCodeScanner
