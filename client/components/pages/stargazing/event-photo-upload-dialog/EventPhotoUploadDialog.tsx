import React, { useRef, useState } from 'react'
import { parse as parseExif } from 'exifr'
import { Button, cn, Dialog, Input, Message, Progress } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ACCEPTED_TYPES_ATTR = ACCEPTED_TYPES.join(',')
// Concurrent upload requests in flight at once - a middle ground between
// one-at-a-time (slow for large batches) and firing every file at once
// (risks overwhelming the server/connection on a big gallery dump).
const UPLOAD_CONCURRENCY = 4

type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error' | 'canceled'

interface QueueItem {
    id: string
    file: File
    status: QueueItemStatus
    error?: unknown
}

type DialogPhase = 'idle' | 'uploading' | 'done'

const isAbortError = (error: unknown): boolean => (error as { name?: string } | undefined)?.name === 'AbortError'

const makeItemId = (file: File, index: number): string => `${file.name}-${file.size}-${file.lastModified}-${index}`

const fileKey = (file: File): string => `${file.name}-${file.size}-${file.lastModified}`

export interface EventPhotoUploadDialogProps {
    eventId?: string
    /**
     * Distinct photographer credits already used for this event, sourced from
     * the dedicated `events/:id/photographers` endpoint - independent of
     * which page of the (server-paginated) gallery happens to be loaded, so
     * suggestions aren't missing anyone whose photos are past the first page.
     */
    photographers?: string[]
    open: boolean
    onClose: () => void
    onUploadPhoto?: (photo: ApiModel.EventPhoto) => void
}

/**
 * Batch photo upload for an event gallery. Owns the whole upload lifecycle:
 * picking/dropping files, an optional photographer credit applied to the
 * whole batch, a bounded-concurrency upload queue with best-effort per-file
 * EXIF `DateTimeOriginal` extraction (a missing/unreadable tag just means
 * `takenAt` is omitted - it is never treated as an upload failure), and a
 * final summary with a "retry failed only" action. Supports running a second
 * batch (e.g. a different photographer) in the same dialog session without
 * closing/reopening it.
 *
 * The dialog cannot be closed - no close button, overlay click and Escape
 * are both inert - while the queue is active, and leaving the page is
 * blocked the same way via `useNavigationGuard`: losing the tab mid-batch
 * would silently abandon whichever files hadn't finished yet.
 */
export const EventPhotoUploadDialog: React.FC<EventPhotoUploadDialogProps> = ({
    eventId,
    photographers,
    open,
    onClose,
    onUploadPhoto
}) => {
    const { t } = useTranslation()

    const [phase, setPhase] = useState<DialogPhase>('idle')
    const [photographerName, setPhotographerName] = useState<string>('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [items, setItems] = useState<QueueItem[]>([])
    const [statusText, setStatusText] = useState<string>('')
    const [isDragOver, setIsDragOver] = useState<boolean>(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    // Flipped by Cancel - checked between files (and before/after the async EXIF
    // read) so the queue stops dispatching new requests as soon as possible.
    const cancelRequestedRef = useRef<boolean>(false)
    // In-flight requests, keyed by queue item id, so Cancel can abort exactly
    // the ones still running.
    const abortMapRef = useRef<Map<string, () => void>>(new Map())
    // The photographer name is only editable in the idle step - frozen here for
    // the duration of a batch (including its retries) once upload starts.
    const batchPhotographerRef = useRef<string>('')
    const nextItemIndexRef = useRef<number>(0)

    const [handleUploadPhoto] = API.useEventPhotoUploadPostMutation()

    useNavigationGuard(
        phase === 'uploading',
        t(
            'components.pages.stargazing.event-photo-upload-dialog.leave-confirm',
            'Загрузка фотографий ещё не завершена. Уйти со страницы?'
        )
    )

    const photographerSuggestions = photographers ?? []

    const total = items.length
    const processedCount = items.filter((item) => item.status !== 'pending' && item.status !== 'uploading').length
    const successCount = items.filter((item) => item.status === 'done').length
    const failedItems = items.filter((item) => item.status === 'error')
    const retryableItems = items.filter((item) => item.status === 'error' || item.status === 'canceled')
    const wasCanceled = items.some((item) => item.status === 'canceled')
    const progress = total > 0 ? Math.round((processedCount / total) * 100) : 0

    const resetState = () => {
        setPhase('idle')
        setPhotographerName('')
        setSelectedFiles([])
        setItems([])
        setStatusText('')
        setIsDragOver(false)
        cancelRequestedRef.current = false
        abortMapRef.current.clear()
    }

    const handleClose = () => {
        if (phase === 'uploading') {
            return
        }

        resetState()
        onClose()
    }

    const addFiles = (newFiles: File[]) => {
        const imagesOnly = newFiles.filter((file) => ACCEPTED_TYPES.includes(file.type))

        setSelectedFiles((prev) => {
            const existingKeys = new Set(prev.map(fileKey))
            const additions = imagesOnly.filter((file) => !existingKeys.has(fileKey(file)))
            return [...prev, ...additions]
        })
    }

    const handleBrowseClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            addFiles(Array.from(event.target.files))
        }

        // Allow selecting the same file again after removing it from the list.
        event.target.value = ''
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragOver(false)

        if (event.dataTransfer.files?.length) {
            addFiles(Array.from(event.dataTransfer.files))
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleRemoveSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const updateItem = (id: string, patch: Partial<QueueItem>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    }

    const processItem = async (item: QueueItem) => {
        if (cancelRequestedRef.current) {
            updateItem(item.id, { status: 'canceled' })
            return
        }

        updateItem(item.id, { status: 'uploading' })
        setStatusText(
            t('components.pages.stargazing.event-photo-upload-dialog.status-uploading', 'Загружается {{name}}…', {
                name: item.file.name
            })
        )

        let takenAt: string | undefined

        try {
            const exifData = await parseExif(item.file, ['DateTimeOriginal'])
            const takenAtDate = exifData?.DateTimeOriginal

            if (takenAtDate instanceof Date && !Number.isNaN(takenAtDate.getTime())) {
                takenAt = takenAtDate.toISOString()
            }
        } catch {
            // A missing/unreadable EXIF tag isn't an upload error - `takenAt` is
            // simply omitted and the backend falls back to its own ordering.
        }

        if (cancelRequestedRef.current) {
            updateItem(item.id, { status: 'canceled' })
            return
        }

        const formData = new FormData()
        formData.append('photo', item.file)

        if (batchPhotographerRef.current) {
            formData.append('photographerName', batchPhotographerRef.current)
        }

        if (takenAt) {
            formData.append('takenAt', takenAt)
        }

        const request = handleUploadPhoto({ eventId, formData })
        abortMapRef.current.set(item.id, () => request.abort())

        const result = await request

        abortMapRef.current.delete(item.id)

        if ('error' in result) {
            if (isAbortError(result.error)) {
                updateItem(item.id, { status: 'canceled' })
            } else {
                updateItem(item.id, { status: 'error', error: result.error })
                setStatusText(
                    t(
                        'components.pages.stargazing.event-photo-upload-dialog.status-error',
                        '{{name}} — ошибка загрузки',
                        { name: item.file.name }
                    )
                )
            }
            return
        }

        updateItem(item.id, { status: 'done' })
        onUploadPhoto?.(result.data)
        setStatusText(
            t('components.pages.stargazing.event-photo-upload-dialog.status-done', '{{name}} загружен ✓', {
                name: item.file.name
            })
        )
    }

    const runQueue = async (queueItems: QueueItem[]) => {
        nextItemIndexRef.current = 0

        const worker = async () => {
            for (;;) {
                if (cancelRequestedRef.current) {
                    return
                }

                const index = nextItemIndexRef.current

                if (index >= queueItems.length) {
                    return
                }

                nextItemIndexRef.current += 1
                await processItem(queueItems[index])
            }
        }

        const workerCount = Math.min(UPLOAD_CONCURRENCY, queueItems.length) || 1

        await Promise.all(Array.from({ length: workerCount }, () => worker()))

        setPhase('done')
    }

    const startUpload = () => {
        if (!selectedFiles.length) {
            return
        }

        const newItems: QueueItem[] = selectedFiles.map((file, index) => ({
            id: makeItemId(file, index),
            file,
            status: 'pending'
        }))

        batchPhotographerRef.current = photographerName.trim()
        cancelRequestedRef.current = false
        abortMapRef.current.clear()
        setItems(newItems)
        setSelectedFiles([])
        setStatusText('')
        setPhase('uploading')
        void runQueue(newItems)
    }

    const retryFailed = () => {
        if (!retryableItems.length) {
            return
        }

        const retryIds = new Set(retryableItems.map((item) => item.id))
        const retryQueue = retryableItems.map((item) => ({ ...item, status: 'pending' as const, error: undefined }))

        setItems((prev) =>
            prev.map((item) => (retryIds.has(item.id) ? { ...item, status: 'pending', error: undefined } : item))
        )
        cancelRequestedRef.current = false
        abortMapRef.current.clear()
        setStatusText('')
        setPhase('uploading')
        void runQueue(retryQueue)
    }

    const cancelUpload = () => {
        cancelRequestedRef.current = true
        abortMapRef.current.forEach((abort) => abort())
        setItems((prev) => prev.map((item) => (item.status === 'pending' ? { ...item, status: 'canceled' } : item)))
    }

    const startNewBatch = () => {
        setPhase('idle')
        setItems([])
        setPhotographerName('')
        setStatusText('')
    }

    return (
        <Dialog
            title={t('components.pages.stargazing.event-photo-upload-dialog.title', 'Загрузка фотографий')}
            open={open}
            showCloseButton={phase !== 'uploading'}
            onCloseDialog={phase !== 'uploading' ? handleClose : undefined}
        >
            <div className={styles.content}>
                {phase === 'idle' && (
                    <>
                        <Input
                            placeholder={t(
                                'components.pages.stargazing.event-photo-upload-dialog.photographer-placeholder',
                                'Имя фотографа (необязательно)'
                            )}
                            value={photographerName}
                            list={'event-photo-upload-photographer-suggestions'}
                            onChange={(event) => setPhotographerName(event.target.value)}
                        />
                        <datalist id={'event-photo-upload-photographer-suggestions'}>
                            {photographerSuggestions.map((name) => (
                                <option
                                    key={name}
                                    value={name}
                                />
                            ))}
                        </datalist>

                        <div
                            className={cn(styles.dropZone, isDragOver && styles.dropZoneActive)}
                            role={'button'}
                            tabIndex={0}
                            onClick={handleBrowseClick}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    handleBrowseClick()
                                }
                            }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <p>
                                {t(
                                    'components.pages.stargazing.event-photo-upload-dialog.drop-zone-text',
                                    'Перетащите фотографии сюда или нажмите, чтобы выбрать файлы'
                                )}
                            </p>
                            <input
                                ref={fileInputRef}
                                type={'file'}
                                multiple={true}
                                accept={ACCEPTED_TYPES_ATTR}
                                className={styles.hiddenInput}
                                onChange={handleFileInputChange}
                            />
                        </div>

                        {!!selectedFiles.length && (
                            <ul className={styles.selectedFilesList}>
                                {selectedFiles.map((file, index) => (
                                    <li key={fileKey(file)}>
                                        <span className={styles.selectedFileName}>{file.name}</span>
                                        <button
                                            type={'button'}
                                            className={styles.removeFileButton}
                                            aria-label={t('common.delete', 'Удалить')}
                                            onClick={() => handleRemoveSelectedFile(index)}
                                        >
                                            {'✕'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className={styles.footer}>
                            <Button
                                mode={'secondary'}
                                onClick={handleClose}
                            >
                                {t('common.cancel', 'Отмена')}
                            </Button>
                            <Button
                                mode={'primary'}
                                disabled={!selectedFiles.length}
                                onClick={startUpload}
                            >
                                {t(
                                    'components.pages.stargazing.event-photo-upload-dialog.start-upload',
                                    'Начать загрузку'
                                )}
                            </Button>
                        </div>
                    </>
                )}

                {phase === 'uploading' && (
                    <>
                        <Progress value={progress} />
                        <p className={styles.progressLabel}>
                            {t(
                                'components.pages.stargazing.event-photo-upload-dialog.progress-label',
                                'Загружено {{done}} из {{total}}',
                                { done: processedCount, total }
                            )}
                        </p>
                        <p className={styles.statusText}>{statusText}</p>

                        {!!failedItems.length && (
                            <ul className={styles.errorList}>
                                {failedItems.map((item) => (
                                    <li key={item.id}>
                                        {item.file.name}
                                        {' — '}
                                        {getErrorMessage(item.error) ||
                                            t(
                                                'components.pages.stargazing.event-photo-upload-dialog.file-error',
                                                'ошибка загрузки'
                                            )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className={styles.footer}>
                            <Button
                                mode={'secondary'}
                                onClick={cancelUpload}
                            >
                                {t('common.cancel', 'Отмена')}
                            </Button>
                        </div>
                    </>
                )}

                {phase === 'done' && (
                    <>
                        {!failedItems.length && !wasCanceled && (
                            <Message type={'success'}>
                                {t(
                                    'components.pages.stargazing.event-photo-upload-dialog.summary-success',
                                    'Все фотографии успешно загружены ({{count}})',
                                    { count: successCount }
                                )}
                            </Message>
                        )}

                        {(!!failedItems.length || wasCanceled) && (
                            <Message type={failedItems.length ? 'warning' : 'info'}>
                                {wasCanceled && !failedItems.length
                                    ? t(
                                          'components.pages.stargazing.event-photo-upload-dialog.summary-canceled',
                                          'Загрузка отменена. Загружено {{success}} из {{total}}.',
                                          { success: successCount, total }
                                      )
                                    : t(
                                          'components.pages.stargazing.event-photo-upload-dialog.summary-partial',
                                          'Загружено {{success}} из {{total}}, не удалось загрузить: {{failed}}',
                                          { success: successCount, total, failed: retryableItems.length }
                                      )}
                            </Message>
                        )}

                        {!!failedItems.length && (
                            <ul className={styles.errorList}>
                                {failedItems.map((item) => (
                                    <li key={item.id}>
                                        {item.file.name}
                                        {' — '}
                                        {getErrorMessage(item.error) ||
                                            t(
                                                'components.pages.stargazing.event-photo-upload-dialog.file-error',
                                                'ошибка загрузки'
                                            )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className={styles.footer}>
                            <Button
                                mode={'secondary'}
                                onClick={startNewBatch}
                            >
                                {t(
                                    'components.pages.stargazing.event-photo-upload-dialog.upload-more',
                                    'Загрузить ещё'
                                )}
                            </Button>

                            {!!retryableItems.length && (
                                <Button
                                    mode={'secondary'}
                                    onClick={retryFailed}
                                >
                                    {t(
                                        'components.pages.stargazing.event-photo-upload-dialog.retry-failed',
                                        'Повторить неудачные'
                                    )}
                                </Button>
                            )}

                            <Button
                                mode={'primary'}
                                onClick={handleClose}
                            >
                                {t('common.done', 'Готово')}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    )
}
