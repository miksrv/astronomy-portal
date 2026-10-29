import { copyTextToClipboard } from './clipboard'

type ClipboardStub = { writeText: jest.Mock } | undefined

const setClipboard = (clipboard: ClipboardStub) => {
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}

const setSecureContext = (value: boolean) => {
    Object.defineProperty(window, 'isSecureContext', { value, configurable: true })
}

const setExecCommand = (implementation: (() => boolean) | undefined) => {
    Object.defineProperty(document, 'execCommand', {
        value: implementation ? jest.fn(implementation) : undefined,
        configurable: true
    })
}

describe('copyTextToClipboard', () => {
    afterEach(() => {
        setClipboard(undefined)
        setExecCommand(undefined)
        setSecureContext(true)
    })

    it('uses the async Clipboard API in a secure context', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined)
        setSecureContext(true)
        setClipboard({ writeText })
        setExecCommand(() => {
            throw new Error('should not be reached')
        })

        await expect(copyTextToClipboard('https://example.test/starmap')).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledWith('https://example.test/starmap')
    })

    it('falls back to execCommand when the Clipboard API rejects', async () => {
        const writeText = jest.fn().mockRejectedValue(new Error('denied'))
        setSecureContext(true)
        setClipboard({ writeText })
        setExecCommand(() => true)

        await expect(copyTextToClipboard('text')).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledTimes(1)
        expect(document.execCommand).toHaveBeenCalledWith('copy')
        // The temporary textarea must not linger in the DOM
        expect(document.querySelectorAll('textarea')).toHaveLength(0)
    })

    it('skips the Clipboard API on an insecure (http) page and uses execCommand', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined)
        setSecureContext(false)
        setClipboard({ writeText })
        setExecCommand(() => true)

        await expect(copyTextToClipboard('text')).resolves.toBe(true)
        expect(writeText).not.toHaveBeenCalled()
        expect(document.execCommand).toHaveBeenCalledWith('copy')
    })

    it('resolves false when both strategies fail', async () => {
        setSecureContext(true)
        setClipboard({ writeText: jest.fn().mockRejectedValue(new Error('denied')) })
        setExecCommand(() => false)

        await expect(copyTextToClipboard('text')).resolves.toBe(false)
    })

    it('resolves false when neither the Clipboard API nor execCommand exist', async () => {
        setSecureContext(true)
        setClipboard(undefined)
        setExecCommand(undefined)

        await expect(copyTextToClipboard('text')).resolves.toBe(false)
    })

    it('resolves false when execCommand throws', async () => {
        setSecureContext(false)
        setClipboard(undefined)
        setExecCommand(() => {
            throw new Error('not allowed')
        })

        await expect(copyTextToClipboard('text')).resolves.toBe(false)
        expect(document.querySelectorAll('textarea')).toHaveLength(0)
    })
})
