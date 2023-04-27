import { TBlogMedia } from '@/api/types'
import React, { useMemo, useState } from 'react'
import Lightbox from 'react-image-lightbox'
import Gallery from 'react-photo-gallery'

import styles from './styles.module.sass'

type TNewsPhotosProps = {
    groupId: number
    photos: TBlogMedia[]
}

const NewsPhotos: React.FC<TNewsPhotosProps> = (props) => {
    const { photos: galleryPhotos, groupId } = props
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setCurrentIndex] = useState<number>(0)

    const listGallery = useMemo(() => {
        return galleryPhotos.length
            ? galleryPhotos.map((item) => ({
                  height: item.height / 2,
                  src:
                      process.env.NEXT_PUBLIC_API_HOST +
                      '/news/' +
                      groupId +
                      '/' +
                      item.file,
                  width: item.width / 2
              }))
            : []
    }, [galleryPhotos])

    const getPhotoSrc = (index: number) =>
        process.env.NEXT_PUBLIC_API_HOST +
        '/news/' +
        groupId +
        '/' +
        galleryPhotos[index].file

    return (
        <div className={styles.photos}>
            <Gallery
                photos={listGallery}
                direction={'row'}
                onClick={(event, photos) => {
                    setCurrentIndex(photos.index)
                    setShowLightbox(true)
                }}
            />
            {showLightbox && (
                <Lightbox
                    mainSrc={getPhotoSrc(photoIndex)}
                    nextSrc={getPhotoSrc(
                        (photoIndex + 1) % galleryPhotos.length
                    )}
                    prevSrc={getPhotoSrc(
                        (photoIndex + galleryPhotos.length - 1) %
                            galleryPhotos.length
                    )}
                    onCloseRequest={() => setShowLightbox(false)}
                    onMovePrevRequest={() =>
                        setCurrentIndex(
                            (photoIndex + galleryPhotos.length - 1) %
                                galleryPhotos.length
                        )
                    }
                    onMoveNextRequest={() =>
                        setCurrentIndex((photoIndex + 1) % galleryPhotos.length)
                    }
                />
            )}
        </div>
    )
}

export default NewsPhotos
