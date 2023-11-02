import { fireEvent, render, screen } from '@testing-library/react'

import PostGallery from './PostGallery'

describe('PostGallery', () => {
    it('should render video player for video media type', () => {
        const media = [
            {
                file: 'sample-video.mp4',
                file_type: 'video/mp4',
                height: 10,
                width: 20
            }
        ]

        render(
            <PostGallery
                media={media}
                groupId={1}
            />
        )

        const videoPlayer = screen.getByTestId('video-player')
        expect(videoPlayer).toBeInTheDocument()
    })

    it('should render image for image media type', () => {
        const media = [
            {
                file: 'sample-image.jpg',
                file_type: 'image/jpeg',
                height: 150,
                width: 200
            }
        ]

        render(
            <PostGallery
                media={media}
                groupId={1}
            />
        )

        expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should show the lightbox when clicking on an image', () => {
        const media = [
            {
                file: 'sample-image.jpg',
                file_type: 'image/jpeg',
                height: 150,
                width: 200
            }
        ]

        render(
            <PostGallery
                media={media}
                groupId={1}
            />
        )

        fireEvent.click(screen.getByRole('img'))

        expect(screen.getByLabelText('Lightbox')).toBeInTheDocument()
    })
})
