// import { HOST_IMG } from '@/api/api'
import React from 'react'
import Lightbox, { Slide } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { ImageSlide } from './ImageSlide'
import { VideoSlide } from './VideoSlide'

import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/styles.css'

type Photo = {
    height: number
    width: number
    title: string
    src: string
    // Already-loaded (thumbnail/preview) image URL - shown blurred behind the
    // full-size image while it loads, instead of a blank/black slide.
    preview?: string
    // `<img alt>` text - falls back to `title` when omitted. Kept separate so
    // callers can show a short, repeated `title` in the on-screen caption
    // while still giving each image a unique, SEO/accessibility-relevant
    // `alt` (the caption overlay itself is a JS-rendered runtime element that
    // crawlers don't index, unlike `alt`).
    alt?: string
    // Present (and always 'video') only for a video item - routes this slide
    // through `VideoSlide` instead of `ImageSlide`. See FEAT-26 Business Rule 7.
    type?: 'video'
    // `<video poster>` - the same server-generated `_preview` image already
    // used as `src` for a photo slide. Video-only.
    poster?: string
    // Video length in seconds - not used by `VideoSlide` itself (native
    // `<video controls>` already shows elapsed/total time), kept here so a
    // caller building the slide list doesn't need a separate lookup.
    duration?: number
}

interface PhotoLightboxProps {
    photos?: Photo[]
    photoIndex?: number
    showLightbox?: boolean
    onCloseLightBox?: () => void
    onChangeIndex?: (index: number) => void
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
    photos,
    photoIndex = 0,
    showLightbox,
    onCloseLightBox
}) => {
    // const makeImageLink = (link?: string) =>
    //     link?.includes('http://') || link?.includes('https://')
    //         ? link
    //         : `${HOST_IMG}${link}`

    return (
        <Lightbox
            open={!!showLightbox}
            index={photoIndex}
            plugins={[Captions, Zoom]}
            close={onCloseLightBox}
            render={{
                // `Slide`'s library type only ever describes an image slide (see
                // `SlideTypeKey`), so both the dispatch below and ImageSlide/VideoSlide
                // themselves lean on `any` here - same as the single-cast approach this
                // file already used before video slides existed.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                slide: (props: any) =>
                    props?.slide?.type === 'video' ? <VideoSlide {...props} /> : <ImageSlide {...props} />
            }}
            slides={photos?.map(
                (photo) =>
                    ({
                        alt: photo?.alt ?? photo?.title,
                        duration: photo?.duration,
                        height: photo?.height,
                        poster: photo?.poster,
                        // Custom field (not part of the library's Slide type, picked up by
                        // `ImageSlide`) - already-loaded thumbnail shown behind the full
                        // image while it loads, instead of a blank/black slide. Deliberately
                        // NOT wired through next/image's `placeholder="blur"` +
                        // `blurDataURL`: that mechanism renders the placeholder as an
                        // external <image> reference inside an inline SVG, and browsers
                        // refuse to load cross-origin resources referenced from an
                        // SVG-used-as-image (a "broken image" glyph shows instead) - it
                        // only works with an actual base64 data URI.
                        preview: photo?.preview,
                        // src: makeImageLink(photo?.src),
                        src: photo?.src,
                        title: photo.title || '',
                        type: photo?.type,
                        width: photo?.width
                    }) as Slide
            )}
        />
    )
}
