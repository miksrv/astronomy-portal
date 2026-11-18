import React, { useState } from 'react'
import { cn } from 'simple-react-ui-kit'

import { PhotoLightbox } from '../photo-lightbox'

import { useContentLinks } from './useContentLinks'
import { slidesOf } from './utils'

import styles from './styles.module.sass'

interface ContentTextProps {
    /** The text as HTML, rendered on the server from `client/content/<page>.<locale>.md` */
    html: string
    /** The first paragraph is the page's lead (DESIGN §3); off for a legal text */
    lead?: boolean
    className?: string
}

/**
 * The text of a static page (rules, how-to, privacy...): server-rendered Markdown in the prose
 * role, its first paragraph the lead (unless `lead` is off). Site links navigate without a reload; a row of photos
 * opens the lightbox on the one clicked.
 */
export const ContentText: React.FC<ContentTextProps> = ({ html, lead = true, className }) => {
    const handleLinks = useContentLinks()

    const [lightbox, setLightbox] = useState<{ photos: ReturnType<typeof slidesOf>; index: number; open: boolean }>({
        index: 0,
        open: false,
        photos: []
    })

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (handleLinks(event)) {
            return
        }

        const photo = (event.target as HTMLElement).closest('.content-photo')

        if (!photo) {
            return
        }

        const photos = Array.from(event.currentTarget.querySelectorAll('.content-photo'))

        setLightbox({ index: photos.indexOf(photo), open: true, photos: slidesOf(event.currentTarget) })
    }

    return (
        <>
            {/* A delegated click: the targets are the native links and photo buttons of the text,
                which a keyboard already clicks (Enter, Space) */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
            <article
                className={cn(styles.contentText, lead && styles.lead, className)}
                dangerouslySetInnerHTML={{ __html: html }}
                onClick={handleClick}
            />

            <PhotoLightbox
                photos={lightbox.photos}
                photoIndex={lightbox.index}
                showLightbox={lightbox.open}
                onCloseLightBox={() => setLightbox((state) => ({ ...state, open: false }))}
                onChangeIndex={(index) => setLightbox((state) => ({ ...state, index }))}
            />
        </>
    )
}
