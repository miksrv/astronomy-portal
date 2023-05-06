import { TBlogMedia } from '@/api/types'
import Image from 'next/image'
import Carousel from 'nuka-carousel'
import React, { useState } from 'react'
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
    // const [showLightbox, setShowLightbox] = useState<boolean>(false)
    // const [photoIndex, setCurrentIndex] = useState<number>(0)
    const [playVideo, setPlayVideo] = useState<boolean>(false)

    const imageUrl = process.env.NEXT_PUBLIC_API_HOST + 'news/' + groupId + '/'

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
            {media?.map((item) => (
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
                        />
                    )}
                </div>
            ))}
            {/*{showLightbox && (*/}
            {/*    <Lightbox*/}
            {/*        mainSrc={getPhotoSrc(photoIndex)}*/}
            {/*        nextSrc={getPhotoSrc(*/}
            {/*            (photoIndex + 1) % galleryPhotos.length*/}
            {/*        )}*/}
            {/*        prevSrc={getPhotoSrc(*/}
            {/*            (photoIndex + galleryPhotos.length - 1) %*/}
            {/*            galleryPhotos.length*/}
            {/*        )}*/}
            {/*        onCloseRequest={() => setShowLightbox(false)}*/}
            {/*        onMovePrevRequest={() =>*/}
            {/*            setCurrentIndex(*/}
            {/*                (photoIndex + galleryPhotos.length - 1) %*/}
            {/*                galleryPhotos.length*/}
            {/*            )*/}
            {/*        }*/}
            {/*        onMoveNextRequest={() =>*/}
            {/*            setCurrentIndex((photoIndex + 1) % galleryPhotos.length)*/}
            {/*        }*/}
            {/*    />*/}
            {/*)}*/}
        </Carousel>
    )
}

export default PostGallery
