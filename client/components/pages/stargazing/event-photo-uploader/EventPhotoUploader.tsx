import React, { Ref, useEffect, useRef, useState } from 'react'

import { API, ApiModel } from '@/api'

interface PhotoUploaderProps {
    eventId?: string
    onSelectFiles?: (uploadingPhotosData?: string[]) => void
    onUploadPhoto?: (photo: ApiModel.EventPhoto) => void
    onUploadError?: (error: unknown) => void
    fileInputRef?: React.RefObject<HTMLInputElement | undefined>
}

export const EventPhotoUploader: React.FC<PhotoUploaderProps> = ({
    eventId,
    onSelectFiles,
    onUploadPhoto,
    onUploadError,
    fileInputRef
}) => {
    const [isUploading, setIsUploading] = useState<boolean>(false)
    // Track object URLs so we can revoke them to prevent memory leaks
    const objectUrlsRef = useRef<string[]>([])
    // Bumped whenever the pending queue should be abandoned (event changes mid-upload)
    const uploadTokenRef = useRef<number>(0)

    const [handleUploadPhoto] = API.useEventPhotoUploadPostMutation()

    const showPreview = (files: File[]) => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))

        const urls = files.map((file) => URL.createObjectURL(file)).reverse()

        objectUrlsRef.current = urls
        onSelectFiles?.(urls)
    }

    const uploadQueue = async (files: File[], token: number) => {
        setIsUploading(true)
        onUploadError?.(undefined)
        showPreview(files)

        let remaining = files

        for (const file of files) {
            if (uploadTokenRef.current !== token) {
                // Superseded by a newer selection or an event change — stop here.
                return
            }

            const formData = new FormData()
            formData.append('photo', file)

            const result = await handleUploadPhoto({ eventId, formData })

            if ('error' in result) {
                // Stop the queue on the first failure — the remaining files are
                // left unsent rather than skipped, so the user can retry them.
                showPreview([])
                onUploadError?.(result.error)
                break
            }

            onUploadPhoto?.(result.data)
            remaining = remaining.slice(1)
            showPreview(remaining)
        }

        setIsUploading(false)
    }

    const handleSelectedFilesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files

        if (files?.length && eventId && !isUploading) {
            uploadTokenRef.current += 1
            void uploadQueue(Array.from(files), uploadTokenRef.current)
        }
    }

    useEffect(() => {
        // Abandon any in-flight queue when the event changes (e.g. navigating between event pages).
        uploadTokenRef.current += 1
        setIsUploading(false)
        showPreview([])
    }, [eventId])

    useEffect(
        () => () => {
            objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
        },
        []
    )

    return (
        <input
            multiple={true}
            ref={fileInputRef as Ref<HTMLInputElement> | undefined}
            style={{ display: 'none' }}
            type={'file'}
            accept={'image/png, image/gif, image/jpeg'}
            onChange={handleSelectedFilesUpload}
        />
    )
}
