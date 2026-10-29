/**
 * Copy text to the clipboard with a graceful fallback chain:
 *  1. the async Clipboard API (secure contexts only — on plain http the API is absent
 *     or rejects), then
 *  2. a temporary off-screen <textarea> + the legacy `document.execCommand('copy')`,
 *     which still works in WebViews and http pages where (1) is unavailable.
 *
 * Resolves to `true` when one of the strategies reported success, `false` otherwise —
 * callers then show the text for manual copying instead of failing silently.
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false
    }

    if (window.isSecureContext && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // Permission denied / unsupported — fall through to the legacy path
        }
    }

    return copyViaExecCommand(text)
}

const copyViaExecCommand = (text: string): boolean => {
    if (typeof document.execCommand !== 'function') {
        return false
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.setAttribute('aria-hidden', 'true')
    // Off-screen but still focusable/selectable — display:none would break selection
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'

    const activeElement = document.activeElement as HTMLElement | null

    document.body.appendChild(textarea)

    try {
        textarea.focus()
        textarea.select()
        textarea.setSelectionRange(0, text.length)

        return document.execCommand('copy')
    } catch {
        return false
    } finally {
        textarea.remove()
        // Give focus back to whatever the user had focused (e.g. the toolbar button)
        activeElement?.focus?.()
    }
}
