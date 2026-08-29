import { uploadMediaInChunks } from './chunkedUpload'

type ChunkedUploadHandlers = Parameters<typeof uploadMediaInChunks>[0]
type ChunkedUploadOptions = Parameters<typeof uploadMediaInChunks>[1]

/**
 * RTK Query mutation triggers return a promise that also carries `.abort()`,
 * and `uploadMediaInChunks` relies on both halves - it awaits the promise and
 * registers the abort with the dialog. A plain `jest.fn()` resolving a value
 * would drop the `.abort()` half, so every mocked trigger is built here.
 */
const makeTrigger = (results: unknown[]) => {
    const abort = jest.fn()
    let call = 0

    const trigger = jest.fn((_args: unknown) => {
        const result = results[Math.min(call, results.length - 1)]
        call += 1

        return Object.assign(Promise.resolve(result), { abort })
    })

    return Object.assign(trigger, { abort })
}

const CHUNK_SIZE = 10

/** 25 bytes -> exactly three chunks of 10/10/5 at CHUNK_SIZE. */
const makeFile = (type = 'video/mp4') => new File(['x'.repeat(25)], 'clip.mp4', { type })

interface Mocks {
    init: ReturnType<typeof makeTrigger>
    chunk: ReturnType<typeof makeTrigger>
    finalize: ReturnType<typeof makeTrigger>
    cancel: ReturnType<typeof makeTrigger>
}

const makeMocks = (overrides: Partial<Record<keyof Mocks, unknown[]>> = {}): Mocks => ({
    cancel: makeTrigger(overrides.cancel ?? [{ data: { status: 'aborted' } }]),
    chunk: makeTrigger(overrides.chunk ?? [{ data: { receivedBytes: 10, receivedChunks: [0] } }]),
    finalize: makeTrigger(overrides.finalize ?? [{ data: { eventId: 'evt1', ext: 'mp4', name: 'clip' } }]),
    init: makeTrigger(overrides.init ?? [{ data: { chunkSize: CHUNK_SIZE, sessionId: 'sess1' } }])
})

const asHandlers = (mocks: Mocks): ChunkedUploadHandlers =>
    ({
        cancelMedia: mocks.cancel,
        finalizeMedia: mocks.finalize,
        initMedia: mocks.init,
        uploadChunk: mocks.chunk
    }) as unknown as ChunkedUploadHandlers

const makeOptions = (overrides: Partial<ChunkedUploadOptions> = {}): ChunkedUploadOptions => ({
    clearAbort: jest.fn(),
    eventId: 'evt1',
    file: makeFile(),
    isCanceled: () => false,
    mediaType: 'video',
    meta: { duration: 42, height: 1080, poster: new Blob(['p'], { type: 'image/jpeg' }), width: 1920 },
    onPhaseChange: jest.fn(),
    onProgress: jest.fn(),
    registerAbort: jest.fn(),
    ...overrides
})

const abortError = { error: { name: 'AbortError' } }

describe('uploadMediaInChunks', () => {
    it('slices the file into chunk-sized parts and reports progress for each', async () => {
        const mocks = makeMocks()
        const onProgress = jest.fn()

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions({ onProgress }))

        expect(result.status).toBe('done')
        expect(mocks.chunk).toHaveBeenCalledTimes(3)

        const sentChunks = mocks.chunk.mock.calls.map(([args]) => (args as { formData: FormData }).formData)

        expect(sentChunks.map((formData) => formData.get('chunkIndex'))).toEqual(['0', '1', '2'])
        expect(sentChunks.map((formData) => (formData.get('chunk') as Blob).size)).toEqual([10, 10, 5])

        // 1/3, 2/3, 3/3 - the dialog's overall bar moves within a single
        // large file, not only when the whole file lands.
        expect(onProgress.mock.calls.map(([fraction]) => fraction)).toEqual([1 / 3, 2 / 3, 1])
    })

    it('uses the server-issued chunkSize, not a client-side constant', async () => {
        const mocks = makeMocks({ init: [{ data: { chunkSize: 25, sessionId: 'sess1' } }] })

        await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(mocks.chunk).toHaveBeenCalledTimes(1)
    })

    it('sends the session id and the video metadata on finalize', async () => {
        const mocks = makeMocks()

        await uploadMediaInChunks(
            asHandlers(mocks),
            makeOptions({
                meta: { duration: 42, height: 1080, photographerName: 'Иван', poster: new Blob(['p']), width: 1920 }
            })
        )

        const [args] = mocks.finalize.mock.calls[0] as unknown as [{ sessionId: string; formData: FormData }]

        expect(args.sessionId).toBe('sess1')
        expect(args.formData.get('photographerName')).toBe('Иван')
        expect(args.formData.get('duration')).toBe('42')
        expect(args.formData.get('width')).toBe('1920')
        expect(args.formData.get('height')).toBe('1080')
        expect(args.formData.get('poster')).toBeInstanceOf(Blob)
    })

    it('sends takenAt instead of video metadata for a photo', async () => {
        const mocks = makeMocks()

        await uploadMediaInChunks(
            asHandlers(mocks),
            makeOptions({
                file: makeFile('image/jpeg'),
                mediaType: 'photo',
                meta: { takenAt: '2026-08-01T00:00:00.000Z' }
            })
        )

        const [args] = mocks.finalize.mock.calls[0] as unknown as [{ formData: FormData }]

        expect(args.formData.get('takenAt')).toBe('2026-08-01T00:00:00.000Z')
        expect(args.formData.get('duration')).toBeNull()
    })

    it('reports an init failure as an error without touching the chunk endpoints', async () => {
        const mocks = makeMocks({ init: [{ error: { status: 400 } }] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ error: { status: 400 }, status: 'error' })
        expect(mocks.chunk).not.toHaveBeenCalled()
        // No session exists yet, so there is nothing to clean up server-side.
        expect(mocks.cancel).not.toHaveBeenCalled()
    })

    it('treats an aborted init as a cancellation, not an error', async () => {
        const mocks = makeMocks({ init: [abortError] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ status: 'canceled' })
        expect(mocks.cancel).not.toHaveBeenCalled()
    })

    it('does nothing at all when cancellation was requested before init', async () => {
        const mocks = makeMocks()

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions({ isCanceled: () => true }))

        expect(result).toEqual({ status: 'canceled' })
        expect(mocks.init).not.toHaveBeenCalled()
    })

    it('cancels the server session when a chunk request is aborted', async () => {
        const mocks = makeMocks({ chunk: [abortError] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ status: 'canceled' })
        expect(mocks.cancel).toHaveBeenCalledWith({ sessionId: 'sess1' })
    })

    it('cancels the server session when cancellation is flagged between chunks', async () => {
        const mocks = makeMocks()
        let canceled = false
        const onProgress = jest.fn(() => {
            canceled = true
        })

        const result = await uploadMediaInChunks(
            asHandlers(mocks),
            makeOptions({ isCanceled: () => canceled, onProgress })
        )

        expect(result).toEqual({ status: 'canceled' })
        expect(mocks.chunk).toHaveBeenCalledTimes(1)
        expect(mocks.cancel).toHaveBeenCalledWith({ sessionId: 'sess1' })
        expect(mocks.finalize).not.toHaveBeenCalled()
    })

    it('keeps the session on a failed chunk so the upload can be retried', async () => {
        const mocks = makeMocks({ chunk: [{ error: { status: 500 } }] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ error: { status: 500 }, status: 'error' })
        expect(mocks.cancel).not.toHaveBeenCalled()
    })

    it('announces the finalizing phase before the finalize request', async () => {
        const mocks = makeMocks()
        const onPhaseChange = jest.fn()

        await uploadMediaInChunks(asHandlers(mocks), makeOptions({ onPhaseChange }))

        expect(onPhaseChange).toHaveBeenCalledWith('finalizing')
    })

    it('reports a finalize failure as an error', async () => {
        const mocks = makeMocks({ finalize: [{ error: { status: 500 } }] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ error: { status: 500 }, status: 'error' })
        expect(mocks.cancel).not.toHaveBeenCalled()
    })

    it('cancels the server session when finalize is aborted', async () => {
        const mocks = makeMocks({ finalize: [abortError] })

        const result = await uploadMediaInChunks(asHandlers(mocks), makeOptions())

        expect(result).toEqual({ status: 'canceled' })
        expect(mocks.cancel).toHaveBeenCalledWith({ sessionId: 'sess1' })
    })

    it('registers an abort callback for every request and clears it afterwards', async () => {
        const mocks = makeMocks()
        const registerAbort = jest.fn()
        const clearAbort = jest.fn()

        await uploadMediaInChunks(asHandlers(mocks), makeOptions({ clearAbort, registerAbort }))

        // init + 3 chunks + finalize
        expect(registerAbort).toHaveBeenCalledTimes(5)
        expect(clearAbort).toHaveBeenCalledTimes(5)

        registerAbort.mock.calls.forEach(([abort]) => (abort as () => void)())
        expect(mocks.init.abort).toHaveBeenCalled()
        expect(mocks.chunk.abort).toHaveBeenCalled()
        expect(mocks.finalize.abort).toHaveBeenCalled()
    })
})
