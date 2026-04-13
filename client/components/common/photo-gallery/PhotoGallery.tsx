import React from 'react'
import { RowsPhotoAlbum, RowsPhotoAlbumProps } from 'react-photo-album'

import 'react-photo-album/rows.css'

type PhotoGalleryProps = RowsPhotoAlbumProps

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ ...props }) => (
    <RowsPhotoAlbum
        {...props}
        spacing={5}
        targetRowHeight={160}
        // Apply lazy loading to gallery images to reduce initial page load
        componentsProps={{ image: { loading: 'lazy' } }}
    />
)
