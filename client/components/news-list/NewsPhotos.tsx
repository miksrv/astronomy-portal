import { TBlogMedia } from '@/api/types'
import Image from 'next/image'
import Carousel from 'nuka-carousel'
import React, { useMemo, useState } from 'react'
import Lightbox from 'react-image-lightbox'
import ReactPlayer from 'react-player'
import { Icon } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TNewsPhotosProps = {
    groupId: number
    photos: TBlogMedia[]
}

const config = {
    attributes: {
        controlsList: 'nodownload',
        disablePictureInPicture: true
    }
}

const NewsPhotos: React.FC<TNewsPhotosProps> = (props) => {
    const { photos: galleryPhotos, groupId } = props
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setCurrentIndex] = useState<number>(0)
    const [playVideo, setPlayVideo] = useState<boolean>(false)

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

    const imageUrl = process.env.NEXT_PUBLIC_API_HOST + '/news/' + groupId + '/'

    return (
        <>
            <Carousel
                adaptiveHeight={true}
                withoutControls={galleryPhotos?.length === 1 || playVideo}
                className={styles.slider}
                defaultControlsConfig={{
                    nextButtonClassName: styles.sliderNextButton,
                    nextButtonText: <Icon name={'angle right'} />,
                    pagingDotsClassName: styles.sliderDots,
                    pagingDotsContainerClassName: styles.sliderDotsContainer,
                    prevButtonClassName: styles.sliderPrevButton,
                    prevButtonText: <Icon name={'angle left'} />
                }}
                onDragEnd={() => setPlayVideo(false)}
            >
                {galleryPhotos.map((item, key) => (
                    <div
                        className={styles.sliderItem}
                        key={key}
                    >
                        <div
                            className={styles.sliderItemBackground}
                            style={{
                                backgroundImage: `url(${imageUrl}/${item.file})`
                            }}
                        />
                        {item.file_type === 'video/mp4' ? (
                            <ReactPlayer
                                url={`${imageUrl}/${item.file}`}
                                controls={true}
                                onPause={() => setPlayVideo(false)}
                                onEnded={() => setPlayVideo(false)}
                                onPlay={() => setPlayVideo(true)}
                                // @ts-ignore
                                config={config}
                                // height={300}
                            />
                        ) : (
                            <Image
                                className={styles.sliderImage}
                                src={`${imageUrl}/${item.file}`}
                                alt={''}
                                width={item.width}
                                height={item.height}
                            />
                        )}
                    </div>
                ))}
            </Carousel>
            {/*<Gallery*/}
            {/*    photos={listGallery}*/}
            {/*    direction={'row'}*/}
            {/*    onClick={(event, photos) => {*/}
            {/*        setCurrentIndex(photos.index)*/}
            {/*        setShowLightbox(true)*/}
            {/*    }}*/}
            {/*/>*/}
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
        </>
    )
}

export default NewsPhotos
