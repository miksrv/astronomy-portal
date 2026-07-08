import React, { useEffect } from 'react'
import { AttributionControl, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { cn } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import googleLogo from '@/public/images/google-logo.png'
import yandexLogo from '@/public/images/yandex-logo.png'
import { getGoogleMapLink, getYandexMapLink } from '@/utils/maps'

import { TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from './constants'

import styles from './styles.module.sass'

// Bundlers can't resolve Leaflet's default marker icon paths, so it's pointed
// at copies checked into public/ instead (see client/public/images/leaflet).
const markerIcon = L.icon({
    iconUrl: '/images/leaflet/marker-icon.png',
    iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
    shadowUrl: '/images/leaflet/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

export interface EventMapRenderProps {
    latitude: number
    longitude: number
    editable?: boolean
    zoom?: number
    height?: number | string
    className?: string
    onChange?: (coords: { latitude: number; longitude: number }) => void
}

interface MapCenterSyncProps {
    latitude: number
    longitude: number
}

// Recenters the map whenever the coordinates change from outside (typed into
// the lat/lng inputs, or a fresh event loaded) rather than from dragging the
// marker itself.
const MapCenterSync: React.FC<MapCenterSyncProps> = ({ latitude, longitude }) => {
    const map = useMap()

    useEffect(() => {
        map.setView([latitude, longitude])
        // Only the coordinates should trigger a recenter, not the map instance.
    }, [latitude, longitude])

    return null
}

export const EventMapRender: React.FC<EventMapRenderProps> = ({
    latitude,
    longitude,
    editable = false,
    zoom = 14,
    height = 260,
    className,
    onChange
}) => {
    const { t } = useTranslation()

    return (
        <div className={cn(styles.wrapper, className)}>
            <MapContainer
                center={[latitude, longitude]}
                zoom={zoom}
                scrollWheelZoom={editable}
                style={{ height, width: '100%' }}
                className={styles.mapContainer}
                attributionControl={false}
            >
                <TileLayer
                    attribution={TILE_LAYER_ATTRIBUTION}
                    url={TILE_LAYER_URL}
                />

                <AttributionControl
                    position={'bottomright'}
                    prefix={false}
                />

                <Marker
                    position={[latitude, longitude]}
                    icon={markerIcon}
                    draggable={editable}
                    eventHandlers={
                        editable
                            ? {
                                  dragend: (event) => {
                                      const position = (event.target as L.Marker).getLatLng()
                                      onChange?.({ latitude: position.lat, longitude: position.lng })
                                  }
                              }
                            : undefined
                    }
                />

                <MapCenterSync
                    latitude={latitude}
                    longitude={longitude}
                />
            </MapContainer>

            {!editable && (
                <div className={styles.externalLinks}>
                    <Link
                        className={styles.externalLink}
                        href={getYandexMapLink(latitude, longitude)}
                        target={'_blank'}
                        rel={'noopener noreferrer'}
                    >
                        <Image
                            src={yandexLogo.src}
                            width={18}
                            height={18}
                            alt={''}
                        />
                        {t('components.common.event-map.yandex-maps', 'Яндекс Карты')}
                    </Link>
                    <Link
                        className={styles.externalLink}
                        href={getGoogleMapLink(latitude, longitude)}
                        target={'_blank'}
                        rel={'noopener noreferrer'}
                    >
                        <Image
                            src={googleLogo.src}
                            width={18}
                            height={18}
                            alt={''}
                        />
                        {t('components.common.event-map.google-maps', 'Google Карты')}
                    </Link>
                </div>
            )}
        </div>
    )
}

export default EventMapRender
