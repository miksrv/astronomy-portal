'use client'

import React from 'react'
import Lightbox from 'react-image-lightbox'

interface PhotoLightboxProps {
    photos?: string[]
    thumbnail?: string[]
    photoIndex?: number
    showLightbox?: boolean
    onCloseLightBox?: () => void
    onChangeIndex?: (index: number) => void
}

const PhotoLightboxOld: React.FC<PhotoLightboxProps> = ({
    photos,
    thumbnail,
    photoIndex = 0,
    showLightbox,
    onCloseLightBox,
    onChangeIndex
}) => (
    <>
        {showLightbox && !!photos?.length && (
            <Lightbox
                mainSrc={photos?.[photoIndex]}
                nextSrc={photos?.[(photoIndex + 1) % (photos.length || 0)]}
                prevSrc={
                    photos?.[
                        (photoIndex + (photos.length || 0) - 1) %
                            (photos.length || 0)
                    ]
                }
                mainSrcThumbnail={photos?.[photoIndex]}
                prevSrcThumbnail={
                    thumbnail?.[
                        (photoIndex + (photos.length || 0) - 1) %
                            (photos.length || 0)
                    ]
                }
                nextSrcThumbnail={
                    thumbnail?.[(photoIndex + 1) % (photos.length || 0)]
                }
                onCloseRequest={() => onCloseLightBox?.()}
                onMovePrevRequest={() =>
                    onChangeIndex?.(
                        (photoIndex + (photos.length || 0) - 1) %
                            (photos.length || 0)
                    )
                }
                onMoveNextRequest={() =>
                    onChangeIndex?.((photoIndex + 1) % (photos.length || 0))
                }
            />
        )}
    </>
)

export default PhotoLightboxOld
