import React, { useState } from 'react'

import dynamic from 'next/dynamic'

import type { PhotoLightboxRenderProps } from './PhotoLightboxRender'

// The lightbox library, its plugins and CSS are only needed once a visitor
// actually opens a photo, so they stay out of the page's initial bundle.
const PhotoLightboxRender = dynamic(() => import('./PhotoLightboxRender'), {
    ssr: false
})

export type PhotoLightboxProps = PhotoLightboxRenderProps

export const PhotoLightbox: React.FC<PhotoLightboxProps> = (props) => {
    // Mounted on the first open and kept mounted afterwards, so closing still
    // plays the library's fade-out instead of the lightbox vanishing at once.
    const [wasOpened, setWasOpened] = useState<boolean>(false)

    if (props.showLightbox && !wasOpened) {
        setWasOpened(true)
    }

    return wasOpened ? <PhotoLightboxRender {...props} /> : null
}
