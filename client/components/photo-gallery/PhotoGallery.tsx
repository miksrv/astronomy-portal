import React from 'react'
import { RowsPhotoAlbum } from 'react-photo-album'
import { RowsPhotoAlbumProps } from 'react-photo-album/dist/types'

import 'react-photo-album/rows.css'

interface PhotoGalleryProps extends RowsPhotoAlbumProps {}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ ...props }) => (
    <RowsPhotoAlbum
        {...props}
        spacing={5}
        targetRowHeight={160}
    />
)

export default PhotoGallery
