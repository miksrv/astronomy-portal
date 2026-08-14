import React, { useEffect, useState } from 'react'
import { isImageFitCover, isImageSlide, Slide, useLightboxProps, useLightboxState } from 'yet-another-react-lightbox'

import Image, { ImageProps } from 'next/image'

// `preview` is a custom field added in `PhotoLightbox` (not part of the
// library's Slide type) - see the comment there for why it's a plain prop
// instead of next/image's `placeholder="blur"` + `blurDataURL`.
type SlideWithPreview = ImageProps & { preview?: string }

interface ImageSlideProps {
    slide: SlideWithPreview
    offset: number
    rect: {
        height: number
        width: number
    }
}

const isNextJsImage = (slide: Slide) =>
    isImageSlide(slide) && typeof slide.width === 'number' && typeof slide.height === 'number'

export const ImageSlide: React.FC<ImageSlideProps> = ({ slide, offset, rect }) => {
    const {
        on: { click },
        carousel: { imageFit }
    } = useLightboxProps()

    const { currentIndex } = useLightboxState()

    // The carousel reuses slide components across neighbouring positions as
    // the user navigates, so the same instance can receive a new `slide.src`
    // - reset the "loaded" flag whenever that happens, otherwise the new
    // (still loading) full image would be shown at full opacity with nothing
    // behind it.
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        setIsLoaded(false)
    }, [slide.src])

    const cover = isImageSlide(slide as Slide) && isImageFitCover(slide as Slide, imageFit)

    if (!isNextJsImage(slide as Slide)) {
        return undefined
    }

    const width = !cover
        ? Math.round(Math.min(rect.width, (rect.height / Number(slide.height)) * Number(slide.width)))
        : rect.width

    const height = !cover
        ? Math.round(Math.min(rect.height, (rect.width / Number(slide.width)) * Number(slide.height)))
        : rect.height

    // TODO https://yet-another-react-lightbox.com/examples/nextjs
    return (
        <div style={{ height, overflow: 'hidden', position: 'relative', width }}>
            {slide.preview && (
                // Already-loaded thumbnail, shown (blurred, to hide upscaling
                // artefacts) until the full image below finishes loading and fades
                // in over it - a plain CSS background works for a cross-origin
                // preview URL, unlike next/image's SVG-based blur placeholder.
                <div
                    aria-hidden={true}
                    style={{
                        backgroundImage: `url("${slide.preview}")`,
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: cover ? 'cover' : 'contain',
                        filter: 'blur(16px)',
                        inset: 0,
                        position: 'absolute',
                        transform: 'scale(1.1)'
                    }}
                />
            )}
            <Image
                fill={true}
                alt={slide.alt || ''}
                src={slide.src}
                loading='eager'
                draggable={false}
                style={{
                    cursor: click ? 'pointer' : undefined,
                    objectFit: cover ? 'cover' : 'contain',
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.2s ease-in'
                }}
                sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
                onClick={offset === 0 ? () => click?.({ index: currentIndex }) : undefined}
                onLoad={() => setIsLoaded(true)}
            />
        </div>
    )
}
