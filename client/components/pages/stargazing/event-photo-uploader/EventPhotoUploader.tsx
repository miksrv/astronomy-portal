import React, { Ref, useEffect, useRef, useState } from 'react'

import { API, ApiModel } from '@/api'

interface PhotoUploaderProps {
    eventId?: string
    onSelectFiles?: (uploadingPhotosData?: string[]) => void
    onUploadPhoto?: (photo: ApiModel.EventPhoto) => void
    fileInputRef?: React.RefObject<HTMLInputElement | undefined>
}

export const EventPhotoUploader: React.FC<PhotoUploaderProps> = ({
    eventId,
    onSelectFiles,
    onUploadPhoto,
    fileInputRef
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    // Track object URLs so we can revoke them to prevent memory leaks
    const objectUrlsRef = useRef<string[]>([])

    const [handleUploadPhoto, { data: uploadedPhoto, isLoading: uploadLoading, isError: uploadError }] =
        API.useEventPhotoUploadPostMutation()

    const handleSelectedFilesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files

        if (files?.length && eventId && !uploadLoading) {
            const filesList = Array.from(files).map((file) => file)
            setSelectedFiles(filesList)
        }
    }

    /**
     * If an error occurs in downloading a file, clear the queue of the list of photos for downloading
     * #TODO:Add notification
     */
    useEffect(() => {
        setSelectedFiles([])
    }, [uploadError])

    /** After successfully uploading each photo:
     * - remove one file from the download queue
     * - add the uploaded photo to the list of other photos
     */
    useEffect(() => {
        if (uploadedPhoto) {
            const uploadingFiles = [...selectedFiles]
            uploadingFiles.shift()

            setSelectedFiles(uploadingFiles)
            onUploadPhoto?.(uploadedPhoto)
        }
    }, [uploadedPhoto])

    /**
     * After each update of the download queue:
     * - perform a request to download the first file from the queue
     */
    useEffect(() => {
        if (selectedFiles.length) {
            const formData = new FormData()

            formData.append('photo', selectedFiles[0])

            void handleUploadPhoto({
                eventId: eventId,
                formData
            })
        }
    }, [selectedFiles])

    useEffect(() => {
        setSelectedFiles([])
    }, [eventId])

    useEffect(() => {
        // Revoke previously created object URLs before creating new ones
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))

        const urls = selectedFiles.map((file) => URL.createObjectURL(file)).reverse()

        objectUrlsRef.current = urls
        onSelectFiles?.(urls)

        return () => {
            // Revoke on cleanup (unmount or next effect run)
            objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
            objectUrlsRef.current = []
        }
    }, [selectedFiles])

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
