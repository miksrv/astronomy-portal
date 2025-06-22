import React from 'react'
import { isImageFitCover, isImageSlide, Slide, useLightboxProps, useLightboxState } from 'yet-another-react-lightbox'

import Image, { ImageProps } from 'next/image'

interface ImageSlideProps {
    slide: ImageProps
    offset: number
    rect: {
        height: number
        width: number
    }
}

const isNextJsImage = (slide: Slide) =>
    isImageSlide(slide) && typeof slide.width === 'number' && typeof slide.height === 'number'

const ImageSlide: React.FC<ImageSlideProps> = ({ slide, offset, rect }) => {
    const {
        on: { click },
        carousel: { imageFit }
    } = useLightboxProps()

    const { currentIndex } = useLightboxState()

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
        <div style={{ height, position: 'relative', width }}>
            <Image
                fill
                alt=''
                src={slide.src}
                loading='eager'
                draggable={false}
                placeholder={slide.blurDataURL ? 'blur' : undefined}
                style={{
                    cursor: click ? 'pointer' : undefined,
                    objectFit: cover ? 'cover' : 'contain'
                }}
                sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
                onClick={offset === 0 ? () => click?.({ index: currentIndex }) : undefined}
            />
        </div>
    )
}

export default ImageSlide
