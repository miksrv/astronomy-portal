import { imageHost } from '@/api/api'
import { TBlogMedia } from '@/api/types'
import Image from 'next/image'
import Carousel from 'nuka-carousel'
import React, { useState } from 'react'
import Lightbox from 'react-image-lightbox'
import ReactPlayer from 'react-player'
import { Icon } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TPostGalleryProps = {
    groupId: number
    media?: TBlogMedia[]
}

const config = {
    attributes: {
        controlsList: 'nodownload',
        disablePictureInPicture: true
    }
}

const PostGallery: React.FC<TPostGalleryProps> = ({ media, groupId }) => {
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setCurrentIndex] = useState<number>(0)
    const [playVideo, setPlayVideo] = useState<boolean>(false)

    const imageUrl = imageHost + 'news/' + groupId + '/'
    const getPhotoByIndex = (index: number) => imageUrl + media?.[index]?.file

    return (
        <Carousel
            adaptiveHeight={true}
            withoutControls={media?.length === 1 || playVideo}
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
            {media?.map((item, key) => (
                <div
                    className={styles.sliderItem}
                    key={item.file}
                >
                    <div
                        className={styles.sliderItemBackground}
                        style={{
                            backgroundImage:
                                item.file_type !== 'video/mp4'
                                    ? `url(${imageUrl}${item.file})`
                                    : undefined
                        }}
                    />
                    {item.file_type === 'video/mp4' ? (
                        <ReactPlayer
                            url={`${imageUrl}${item.file}`}
                            controls={true}
                            onPause={() => setPlayVideo(false)}
                            onEnded={() => setPlayVideo(false)}
                            onPlay={() => setPlayVideo(true)}
                            // @ts-ignore
                            config={config}
                        />
                    ) : (
                        <Image
                            className={styles.sliderImage}
                            src={`${imageUrl}${item.file}`}
                            alt={'Фотография астрономического блока'}
                            width={item.width}
                            height={item.height}
                            onClick={() => {
                                setCurrentIndex(key)
                                setShowLightbox(true)
                            }}
                        />
                    )}
                </div>
            ))}
            {showLightbox && (
                <Lightbox
                    mainSrc={getPhotoByIndex(photoIndex)}
                    nextSrc={getPhotoByIndex((photoIndex + 1) % media?.length!)}
                    prevSrc={getPhotoByIndex(
                        (photoIndex + media?.length! - 1) % media?.length!
                    )}
                    onCloseRequest={() => setShowLightbox(false)}
                    onMovePrevRequest={() =>
                        setCurrentIndex(
                            (photoIndex + media?.length! - 1) % media?.length!
                        )
                    }
                    onMoveNextRequest={() =>
                        setCurrentIndex((photoIndex + 1) % media?.length!)
                    }
                />
            )}
        </Carousel>
    )
}

export default PostGallery
