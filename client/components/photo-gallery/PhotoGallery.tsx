import { ApiModel } from '@/api'
import { imageHost } from '@/api/api'
import React, { useState } from 'react'
import PhotoAlbum from 'react-photo-album'

import PhotoLightbox from '@/components/photo-lightbox'

interface PhotoGalleryProps {
    photos?: ApiModel.EventPhoto[]
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos }) => {
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setPhotoIndex] = useState<number>()

    const handleCloseLightbox = () => {
        setShowLightbox(false)
    }

    const handlePhotoClick = (index: number) => {
        setPhotoIndex(index)
        setShowLightbox(true)
    }

    return (
        <>
            <PhotoAlbum
                layout={'rows'}
                spacing={5}
                photos={
                    photos?.map((photo) => ({
                        height: photo.height,
                        src: `${imageHost}${photo.preview}`,
                        width: photo.width
                    })) || []
                }
                onClick={({ index }) => {
                    handlePhotoClick(index)
                }}
            />

            <PhotoLightbox
                photos={photos}
                photoIndex={photoIndex}
                showLightbox={showLightbox}
                onCloseLightBox={handleCloseLightbox}
            />
        </>
    )
}

export default PhotoGallery
