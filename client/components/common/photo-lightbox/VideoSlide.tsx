import React, { useEffect, useRef } from 'react'

interface VideoSlideData {
    src: string
    width?: number
    height?: number
    /** Poster image URL, shown until playback starts (and while paused/seeking). */
    poster?: string
}

interface VideoSlideProps {
    slide: VideoSlideData
    offset: number
    rect: {
        height: number
        width: number
    }
}

/**
 * Video-capable counterpart to `ImageSlide` for the lightbox - same
 * contain-fit sizing math (a portrait video is centered at its natural
 * aspect ratio, never cropped/stretched), rendering a native `<video>`
 * instead of `next/image`. Business Rule 7 (FEAT-26) always shows a video
 * `contain`-fit - this app never sets a per-slide or global
 * `imageFit: 'cover'` (see `ImageSlide`/`PhotoLightbox`), so unlike
 * `ImageSlide` there's no `cover` branch to replicate here.
 */
export const VideoSlide: React.FC<VideoSlideProps> = ({ slide, offset, rect }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    // Pause and rewind whenever this slide stops being the one on screen - the
    // carousel keeps neighbouring slide instances mounted for the swipe
    // transition, so a playing video would otherwise keep making sound/using
    // CPU after the user has already navigated to a different slide.
    // `slide.src` is in the dependency list for the same reason `ImageSlide`
    // resets its loaded flag on it: the carousel reuses one slide instance
    // across neighbouring positions, so the same <video> element can be
    // handed a different source while `offset` never changes.
    useEffect(() => {
        if (offset !== 0 && videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [offset, slide.src])

    if (typeof slide.width !== 'number' || typeof slide.height !== 'number') {
        return undefined
    }

    const width = Math.round(Math.min(rect.width, (rect.height / slide.height) * slide.width))
    const height = Math.round(Math.min(rect.height, (rect.width / slide.width) * slide.height))

    return (
        <div style={{ height, width }}>
            {/* No <track> element: these are visitor-uploaded event clips with
                no caption/subtitle file to point at, and there is no
                server-side transcoding step that could ever produce one
                (Business Rule 4). An empty <track> would satisfy the rule
                while adding nothing for a screen-reader user. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
                ref={videoRef}
                controls={true}
                playsInline={true}
                poster={slide.poster}
                src={slide.src}
                style={{ height: '100%', objectFit: 'contain', width: '100%' }}
            />
        </div>
    )
}
