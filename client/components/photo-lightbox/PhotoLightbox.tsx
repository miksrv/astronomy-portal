// import { HOST_IMG } from '@/api/api'
import React from 'react'
import Lightbox, { Slide } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import ImageSlide from './ImageSlide'

import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/styles.css'

type Photo = {
    height: number
    width: number
    title: string
    src: string
}

interface PhotoLightboxProps {
    photos?: Photo[]
    photoIndex?: number
    showLightbox?: boolean
    onCloseLightBox?: () => void
    onChangeIndex?: (index: number) => void
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, photoIndex = 0, showLightbox, onCloseLightBox }) => {
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
                        // src: makeImageLink(photo?.src),
                        src: photo?.src,
                        // srcSet: [
                        //     {
                        //         height: 200,
                        //         src: makeImageLink(photo?.preview),
                        //         width: 300
                        //     }
                        // ],
                        title: photo.title || '',
                        width: photo?.width
                    }) as Slide
            )}
        />
    )
}

export default PhotoLightbox
