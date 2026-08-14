// import { HOST_IMG } from '@/api/api'
import React from 'react'
import Lightbox, { Slide } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { ImageSlide } from './ImageSlide'

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={{ slide: ImageSlide as any }}
            slides={photos?.map(
                (photo) =>
                    ({
                        alt: photo?.title,
                        height: photo?.height,
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
                        width: photo?.width
                    }) as Slide
            )}
        />
    )
}
