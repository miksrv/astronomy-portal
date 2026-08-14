import React from 'react'
import { RenderImageProps, RenderPhotoContext, RowsPhotoAlbum, RowsPhotoAlbumProps } from 'react-photo-album'

import Image from 'next/image'

import 'react-photo-album/rows.css'

type PhotoGalleryProps = RowsPhotoAlbumProps

// react-photo-album normally sizes each cell's wrapper implicitly - the <img>
// itself gets `aspect-ratio: var(--photo-width) / var(--photo-height)` (see
// `.react-photo-album--image` in rows.css) and the wrapper's height just
// follows from that. next/image's `fill` mode (used below) needs the size on
// the *parent* instead, so the same ratio is set directly on the wrapper here
// - without it the wrapper collapses to 0 height and the whole gallery disappears.
const withAspectRatio = ({ width, height }: RenderPhotoContext) => ({
    style: { aspectRatio: `${width} / ${height}` }
})

// Swaps react-photo-album's plain <img> for next/image, so gallery photos go
// through the same AVIF/WebP + on-demand resize pipeline (`/_next/image`)
// already used elsewhere in the app (see PhotoLightbox's ImageSlide.tsx),
// instead of being served as-is straight from the backend.
const renderImage = (props: RenderImageProps) => (
    <Image
        fill={true}
        // react-photo-album always builds `src` from `Photo.src`, which is typed
        // as a plain `string` - the wider type here just comes from React's own
        // (experimental) <img src> attribute typing, which next/image doesn't accept.
        src={props.src as string}
        alt={props.alt ?? ''}
        title={props.title}
        sizes={props.sizes}
        loading='lazy'
        style={{ objectFit: 'cover' }}
    />
)

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ defaultContainerWidth = 1200, ...props }) => (
    <RowsPhotoAlbum
        {...props}
        spacing={5}
        targetRowHeight={160}
        // Without an assumed width, react-photo-album renders no <img> tags at
        // all during SSR (it needs the real container width, only knowable in
        // the browser) - the whole gallery would otherwise be invisible to
        // anything that doesn't run JS, and only appear after hydration for
        // everyone else. Callers with a narrower container than the common
        // ~1200px content width can override this.
        defaultContainerWidth={defaultContainerWidth}
        render={{ image: renderImage }}
        componentsProps={{
            button: withAspectRatio,
            link: withAspectRatio,
            wrapper: withAspectRatio
        }}
    />
)
