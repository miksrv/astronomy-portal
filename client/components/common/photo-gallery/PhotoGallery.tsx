import React from 'react'
import { Photo, RenderImageProps, RenderPhotoContext, RowsPhotoAlbum, RowsPhotoAlbumProps } from 'react-photo-album'
import SSR from 'react-photo-album/ssr'

import Image from 'next/image'

import 'react-photo-album/rows.css'
import styles from './styles.module.sass'

// Extends react-photo-album's own `Photo` with the two fields a video tile
// needs on top of what a photo already has - `src`/`width`/`height` stay the
// poster image's (a video is never rendered inline in the grid, only its
// poster - see Business Rule 5 in features/stargazing-event-video-uploads.md).
// Both new fields are optional so every existing photo-only caller
// (pages/about.tsx, observatory/overview.tsx, observatory/history/[slug].tsx,
// stargazing/where.tsx, stargazing/howto.tsx) keeps compiling/rendering
// unchanged.
export interface GalleryPhoto extends Photo {
    mediaType?: 'photo' | 'video'
    /** Video length in seconds - renders as a "0:42"-style badge. Video-only. */
    duration?: number
}

type PhotoGalleryProps = RowsPhotoAlbumProps<GalleryPhoto>

// react-photo-album normally sizes each cell's wrapper implicitly - the <img>
// itself gets `aspect-ratio: var(--photo-width) / var(--photo-height)` (see
// `.react-photo-album--image` in rows.css) and the wrapper's height just
// follows from that. next/image's `fill` mode (used below) needs the size on
// the *parent* instead, so the same ratio is set directly on the wrapper here
// - without it the wrapper collapses to 0 height and the whole gallery disappears.
const withAspectRatio = ({ width, height }: RenderPhotoContext<GalleryPhoto>) => ({
    style: { aspectRatio: `${width} / ${height}` }
})

// "125" -> "2:05" - no leading zero on minutes, always two digits on seconds,
// matching the badge format used across the app's other short-duration UI.
const formatVideoDuration = (seconds: number): string => {
    const total = Math.max(0, Math.round(seconds))
    const minutes = Math.floor(total / 60)
    const secs = total % 60
    return `${minutes}:${String(secs).padStart(2, '0')}`
}

// Swaps react-photo-album's plain <img> for next/image, so gallery photos go
// through the same AVIF/WebP + on-demand resize pipeline (`/_next/image`)
// already used elsewhere in the app (see PhotoLightbox's ImageSlide.tsx),
// instead of being served as-is straight from the backend. A video item
// renders its poster the exact same way, plus a play-icon badge and (when
// known) a duration badge - the grid never autoplays/loads actual video, see
// Business Rule 5: static tile -> click -> lightbox is the same interaction
// model already used for photos.
const renderImage = (props: RenderImageProps, context: RenderPhotoContext<GalleryPhoto>) => (
    <>
        <Image
            fill={true}
            // react-photo-album always builds `src` from `Photo.src`, which is typed
            // as a plain `string` - the wider type here just comes from React's own
            // (experimental) <img src> attribute typing, which next/image doesn't accept.
            src={props.src as string}
            alt={props.alt ?? ''}
            title={props.title}
            sizes={props.sizes}
            loading='lazy'
            style={{ objectFit: 'cover' }}
        />
        {context.photo.mediaType === 'video' && (
            <div
                className={styles.videoOverlay}
                aria-hidden={true}
            >
                <span className={styles.playIcon}>
                    <svg
                        viewBox={'0 0 24 24'}
                        fill={'currentColor'}
                    >
                        <path d={'M8 5v14l11-7z'} />
                    </svg>
                </span>
                {typeof context.photo.duration === 'number' && (
                    <span className={styles.durationBadge}>{formatVideoDuration(context.photo.duration)}</span>
                )}
            </div>
        )}
    </>
)

// Container widths the gallery is laid out for. The server renders one layout per
// breakpoint and CSS shows the one matching the viewport; after hydration the album
// keeps that same breakpoint's layout (scaled to the exact width), so the rows don't
// get re-flowed - and the content below doesn't jump (CLS) - once JS runs.
const GALLERY_BREAKPOINTS = [320, 600, 900, 1200] as const

export const PhotoGallery: React.FC<PhotoGalleryProps> = (props) => (
    <SSR breakpoints={GALLERY_BREAKPOINTS}>
        <RowsPhotoAlbum
            {...props}
            spacing={8}
            targetRowHeight={160}
            render={{ image: renderImage }}
            componentsProps={{
                button: withAspectRatio,
                link: withAspectRatio,
                wrapper: withAspectRatio
            }}
        />
    </SSR>
)
