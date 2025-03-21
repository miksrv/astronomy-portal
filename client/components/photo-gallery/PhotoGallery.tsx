import { RowsPhotoAlbum } from 'react-photo-album'
import 'react-photo-album/rows.css'
import React from 'react'
import { RowsPhotoAlbumProps } from 'react-photo-album/dist/types'

interface PhotoGalleryProps extends RowsPhotoAlbumProps {}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ ...props }) => (
    <RowsPhotoAlbum
        {...props}
        spacing={5}
        targetRowHeight={160}
    />
)

export default PhotoGallery
