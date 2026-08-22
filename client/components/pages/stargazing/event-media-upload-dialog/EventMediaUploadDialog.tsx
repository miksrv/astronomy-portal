import React, { useRef, useState } from 'react'
import { parse as parseExif } from 'exifr'
import { Button, cn, Dialog, Input, Message, Progress } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { getErrorMessage } from '@/utils/errors'

import { uploadMediaInChunks } from './chunkedUpload'
import { ACCEPTED_TYPES_ATTR, UPLOAD_CONCURRENCY } from './constants'
import { fileKey, getMediaType, isAbortError, isUnsupportedVideo, makeItemId } from './utils'
import { extractVideoMetadata } from './video'

import styles from './styles.module.sass'

type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error' | 'canceled'

interface QueueItem {
    id: string
    file: File
    status: QueueItemStatus
    error?: unknown
    /**
     * 0..1 fraction of this item's own chunk-upload progress - only
     * meaningful while `status === 'uploading'`; drives the overall Progress
     * bar so a single large video doesn't sit at the same percentage for the
     * whole time it takes to send its chunks.
     */
    progress?: number
    /** True once this item's upload has moved past its chunks into the (potentially slow) server-side finalize/assembly step. */
    finalizing?: boolean
}

type DialogPhase = 'idle' | 'uploading' | 'done'

export interface EventMediaUploadDialogProps {
    eventId?: string
    /**
     * Distinct photographer credits already used for this event, sourced from
     * the dedicated `events/:id/photographers` endpoint - independent of
     * which page of the (server-paginated) gallery happens to be loaded, so
     * suggestions aren't missing anyone whose media is past the first page.
     */
    photographers?: string[]
    open: boolean
    onClose: () => void
    onUploadMedia?: (media: ApiModel.EventMedia) => void
}

/**
 * Batch photo/video upload for an event gallery. Owns the whole upload
 * lifecycle: picking/dropping files, an optional photographer credit applied
 * to the whole batch, a bounded-concurrency upload queue with best-effort
 * per-file EXIF `DateTimeOriginal` extraction for photos (a missing/unreadable
 * tag just means `takenAt` is omitted - never an upload failure) and required
 * client-side metadata/poster extraction for videos (a failure here IS a
 * per-file error - see `video.ts`), each file uploaded via the chunked
 * init/chunk/finalize protocol (`chunkedUpload.ts`), and a final summary with
 * a "retry failed only" action. Supports running a second batch (e.g. a
 * different photographer) in the same dialog session without closing/
 * reopening it.
 *
 * A `.mov` (`video/quicktime`) file is accepted into the selected-files list
 * (so the picker/drop doesn't just silently ignore it) but shown with an
 * inline "export to MP4" error and excluded from the upload queue - there is
 * no server-side transcoding, so it would look broken to most visitors.
 *
 * The dialog cannot be closed - no close button, overlay click and Escape
 * are both inert - while the queue is active, and leaving the page is
 * blocked the same way via `useNavigationGuard`: losing the tab mid-batch
 * would silently abandon whichever files hadn't finished yet (and leave a
 * dangling upload session, until the 24h server-side cleanup sweep).
 */
export const EventMediaUploadDialog: React.FC<EventMediaUploadDialogProps> = ({
    eventId,
    photographers,
    open,
    onClose,
    onUploadMedia
}) => {
    const { t } = useTranslation()

    const [phase, setPhase] = useState<DialogPhase>('idle')
    const [photographerName, setPhotographerName] = useState<string>('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [items, setItems] = useState<QueueItem[]>([])
    const [statusText, setStatusText] = useState<string>('')
    const [isDragOver, setIsDragOver] = useState<boolean>(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    // Flipped by Cancel - checked between files (and before/after each async
    // step) so the queue stops dispatching new requests as soon as possible.
    const cancelRequestedRef = useRef<boolean>(false)
    // In-flight requests, keyed by queue item id, so Cancel can abort exactly
    // the ones still running.
    const abortMapRef = useRef<Map<string, () => void>>(new Map())
    // The photographer name is only editable in the idle step - frozen here for
    // the duration of a batch (including its retries) once upload starts.
    const batchPhotographerRef = useRef<string>('')
    const nextItemIndexRef = useRef<number>(0)

    const [initMedia] = API.useEventMediaUploadInitMutation()
    const [uploadChunk] = API.useEventMediaUploadChunkMutation()
    const [finalizeMedia] = API.useEventMediaUploadFinalizeMutation()
    const [cancelMedia] = API.useEventMediaUploadCancelMutation()

    useNavigationGuard(
        phase === 'uploading',
        t(
            'components.pages.stargazing.event-media-upload-dialog.leave-confirm',
            'Загрузка ещё не завершена. Уйти со страницы?'
        )
    )

    const photographerSuggestions = photographers ?? []

    const total = items.length
    const processedCount = items.filter((item) => item.status !== 'pending' && item.status !== 'uploading').length
    const successCount = items.filter((item) => item.status === 'done').length
    const failedItems = items.filter((item) => item.status === 'error')
    const retryableItems = items.filter((item) => item.status === 'error' || item.status === 'canceled')
    const wasCanceled = items.some((item) => item.status === 'canceled')
    const unsupportedSelectedFiles = selectedFiles.filter(isUnsupportedVideo)
    const uploadableSelectedFiles = selectedFiles.filter((file) => !isUnsupportedVideo(file))

    // Weighted so a single large video's chunk progress moves the bar
    // continuously instead of it sitting frozen at "0 of 1" for the whole
    // upload - pending items count as 0, an in-progress item counts as its
    // own 0..1 chunk fraction, everything finished (done/error/canceled)
    // counts as a full 1.
    const progress =
        total > 0
            ? Math.round(
                  (items.reduce((sum, item) => {
                      if (item.status === 'uploading') {
                          return sum + (item.progress ?? 0)
                      }
                      if (item.status === 'pending') {
                          return sum
                      }
                      return sum + 1
                  }, 0) /
                      total) *
                      100
              )
            : 0

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
        // Unlike a genuinely unrecognized file type (silently dropped, as
        // before), a `.mov` is deliberately let through here so it can be
        // shown in the list with its own inline "export to MP4" error -
        // see `isUnsupportedVideo`.
        const acceptable = newFiles.filter((file) => !!getMediaType(file) || isUnsupportedVideo(file))

        setSelectedFiles((prev) => {
            const existingKeys = new Set(prev.map(fileKey))
            const additions = acceptable.filter((file) => !existingKeys.has(fileKey(file)))
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

        updateItem(item.id, { status: 'uploading', progress: 0, finalizing: false })
        setStatusText(
            t('components.pages.stargazing.event-media-upload-dialog.status-uploading', 'Загружается {{name}}…', {
                name: item.file.name
            })
        )

        const mediaType = getMediaType(item.file)

        // Defensive only - addFiles/startUpload never let an unsupported or
        // unrecognized file type reach the queue in the first place.
        if (!mediaType) {
            updateItem(item.id, {
                error: {
                    message: t('components.pages.stargazing.event-media-upload-dialog.file-error', 'ошибка загрузки')
                },
                status: 'error'
            })
            return
        }

        let takenAt: string | undefined
        let videoMeta: { width: number; height: number; duration: number; poster: Blob } | undefined

        if (mediaType === 'photo') {
            try {
                const exifData = await parseExif(item.file, ['DateTimeOriginal'])
                const takenAtDate = exifData?.DateTimeOriginal

                if (takenAtDate instanceof Date && !Number.isNaN(takenAtDate.getTime())) {
                    takenAt = takenAtDate.toISOString()
                }
            } catch {
                // A missing/unreadable EXIF tag isn't an upload error - `takenAt`
                // is simply omitted and the backend falls back to its own ordering.
            }
        } else {
            try {
                videoMeta = await extractVideoMetadata(item.file)
            } catch (error) {
                updateItem(item.id, { error, status: 'error' })
                setStatusText(
                    t(
                        'components.pages.stargazing.event-media-upload-dialog.status-error',
                        '{{name}} — ошибка загрузки',
                        { name: item.file.name }
                    )
                )
                return
            }
        }

        if (cancelRequestedRef.current) {
            updateItem(item.id, { status: 'canceled' })
            return
        }

        const result = await uploadMediaInChunks(
            { cancelMedia, finalizeMedia, initMedia, uploadChunk },
            {
                eventId: eventId ?? '',
                file: item.file,
                isCanceled: () => cancelRequestedRef.current,
                mediaType,
                meta: {
                    duration: videoMeta?.duration,
                    height: videoMeta?.height,
                    photographerName: batchPhotographerRef.current || undefined,
                    poster: videoMeta?.poster,
                    takenAt,
                    width: videoMeta?.width
                },
                onPhaseChange: (uploadPhase) => updateItem(item.id, { finalizing: uploadPhase === 'finalizing' }),
                onProgress: (fraction) => updateItem(item.id, { progress: fraction }),
                registerAbort: (abort) => abortMapRef.current.set(item.id, abort),
                clearAbort: () => abortMapRef.current.delete(item.id)
            }
        )

        if (result.status === 'canceled') {
            updateItem(item.id, { status: 'canceled' })
            return
        }

        if (result.status === 'error') {
            if (!isAbortError(result.error)) {
                updateItem(item.id, { error: result.error, status: 'error' })
                setStatusText(
                    t(
                        'components.pages.stargazing.event-media-upload-dialog.status-error',
                        '{{name}} — ошибка загрузки',
                        { name: item.file.name }
                    )
                )
            } else {
                updateItem(item.id, { status: 'canceled' })
            }
            return
        }

        updateItem(item.id, { progress: 1, status: 'done' })
        onUploadMedia?.(result.media)
        setStatusText(
            t('components.pages.stargazing.event-media-upload-dialog.status-done', '{{name}} загружен ✓', {
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
                const item = queueItems[index]

                if (!item) {
                    return
                }

                nextItemIndexRef.current += 1
                await processItem(item)
            }
        }

        const workerCount = Math.min(UPLOAD_CONCURRENCY, queueItems.length) || 1

        await Promise.all(Array.from({ length: workerCount }, () => worker()))

        setPhase('done')
    }

    const startUpload = () => {
        if (!uploadableSelectedFiles.length) {
            return
        }

        const newItems: QueueItem[] = uploadableSelectedFiles.map((file, index) => ({
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
        const retryQueue = retryableItems.map((item) => ({
            ...item,
            error: undefined,
            finalizing: false,
            progress: 0,
            status: 'pending' as const
        }))

        setItems((prev) =>
            prev.map((item) =>
                retryIds.has(item.id)
                    ? { ...item, error: undefined, finalizing: false, progress: 0, status: 'pending' }
                    : item
            )
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

    const currentFinalizingItem = items.find((item) => item.status === 'uploading' && item.finalizing)

    return (
        <Dialog
            title={t('components.pages.stargazing.event-media-upload-dialog.title', 'Загрузка фото и видео')}
            open={open}
            showCloseButton={phase !== 'uploading'}
            onCloseDialog={phase !== 'uploading' ? handleClose : undefined}
        >
            <div className={styles.content}>
                {phase === 'idle' && (
                    <>
                        <Input
                            placeholder={t(
                                'components.pages.stargazing.event-media-upload-dialog.photographer-placeholder',
                                'Имя автора (необязательно)'
                            )}
                            value={photographerName}
                            list={'event-media-upload-photographer-suggestions'}
                            onChange={(event) => setPhotographerName(event.target.value)}
                        />
                        <datalist id={'event-media-upload-photographer-suggestions'}>
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
                                    'components.pages.stargazing.event-media-upload-dialog.drop-zone-text',
                                    'Перетащите фото и видео сюда или нажмите, чтобы выбрать файлы'
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

                        {!!unsupportedSelectedFiles.length && (
                            <Message type={'warning'}>
                                {t(
                                    'components.pages.stargazing.event-media-upload-dialog.unsupported-video-warning',
                                    'Файлы в формате .mov не будут загружены — экспортируйте их в MP4'
                                )}
                            </Message>
                        )}

                        {!!selectedFiles.length && (
                            <ul className={styles.selectedFilesList}>
                                {selectedFiles.map((file, index) => {
                                    const unsupported = isUnsupportedVideo(file)

                                    return (
                                        <li
                                            key={fileKey(file)}
                                            className={cn(unsupported && styles.selectedFileUnsupported)}
                                        >
                                            <span className={styles.selectedFileInfo}>
                                                <span className={styles.selectedFileName}>{file.name}</span>
                                                {unsupported && (
                                                    <span className={styles.selectedFileError}>
                                                        {t(
                                                            'components.pages.stargazing.event-media-upload-dialog.unsupported-video-format',
                                                            'Формат .mov не поддерживается — экспортируйте видео в MP4'
                                                        )}
                                                    </span>
                                                )}
                                            </span>
                                            <button
                                                type={'button'}
                                                className={styles.removeFileButton}
                                                aria-label={t('common.delete', 'Удалить')}
                                                onClick={() => handleRemoveSelectedFile(index)}
                                            >
                                                {'✕'}
                                            </button>
                                        </li>
                                    )
                                })}
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
                                disabled={!uploadableSelectedFiles.length}
                                onClick={startUpload}
                            >
                                {t(
                                    'components.pages.stargazing.event-media-upload-dialog.start-upload',
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
                                'components.pages.stargazing.event-media-upload-dialog.progress-label',
                                'Загружено {{done}} из {{total}}',
                                { done: processedCount, total }
                            )}
                        </p>
                        <p className={styles.statusText}>
                            {currentFinalizingItem
                                ? t(
                                      'components.pages.stargazing.event-media-upload-dialog.status-finalizing',
                                      'Собираем файл {{name}}…',
                                      { name: currentFinalizingItem.file.name }
                                  )
                                : statusText}
                        </p>

                        {!!failedItems.length && (
                            <ul className={styles.errorList}>
                                {failedItems.map((item) => (
                                    <li key={item.id}>
                                        {item.file.name}
                                        {' — '}
                                        {getErrorMessage(item.error) ||
                                            t(
                                                'components.pages.stargazing.event-media-upload-dialog.file-error',
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
                                    'components.pages.stargazing.event-media-upload-dialog.summary-success',
                                    'Все файлы успешно загружены ({{count}})',
                                    { count: successCount }
                                )}
                            </Message>
                        )}

                        {(!!failedItems.length || wasCanceled) && (
                            <Message type={failedItems.length ? 'warning' : 'info'}>
                                {wasCanceled && !failedItems.length
                                    ? t(
                                          'components.pages.stargazing.event-media-upload-dialog.summary-canceled',
                                          'Загрузка отменена. Загружено {{success}} из {{total}}.',
                                          { success: successCount, total }
                                      )
                                    : t(
                                          'components.pages.stargazing.event-media-upload-dialog.summary-partial',
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
                                                'components.pages.stargazing.event-media-upload-dialog.file-error',
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
                                    'components.pages.stargazing.event-media-upload-dialog.upload-more',
                                    'Загрузить ещё'
                                )}
                            </Button>

                            {!!retryableItems.length && (
                                <Button
                                    mode={'secondary'}
                                    onClick={retryFailed}
                                >
                                    {t(
                                        'components.pages.stargazing.event-media-upload-dialog.retry-failed',
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
