import React from 'react'
import { RowsPhotoAlbum, RowsPhotoAlbumProps } from 'react-photo-album'

import 'react-photo-album/rows.css'

type PhotoGalleryProps = RowsPhotoAlbumProps

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
        // Apply lazy loading to gallery images to reduce initial page load
        componentsProps={{ image: { loading: 'lazy' } }}
    />
)
