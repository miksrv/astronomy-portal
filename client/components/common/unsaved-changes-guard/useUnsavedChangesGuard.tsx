import React, { useEffect, useRef, useState } from 'react'
import { Button, Dialog } from 'simple-react-ui-kit'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface UnsavedChangesGuard {
    /** The dialog: render it anywhere in the page */
    dialog: React.ReactNode
    /** A navigation of the page's own (the form's "Cancel"): asks first, like a link would */
    navigate: (url: string) => void
}

/** Where the visitor wanted to go: a link (`push`) or the browser's back/forward (`pop`) */
type PendingLeave = { kind: 'push'; url: string } | { kind: 'pop' }

/**
 * Asks before leaving a form with unsaved changes, in the site's dialog: a link anywhere on the
 * page (the menu, the breadcrumbs, the cancel button), the browser's back and forward buttons;
 * closing or reloading the tab gets the browser's own prompt (a page can't style it).
 *
 * In the form's page: `const guard = useUnsavedChangesGuard(isDirty)`, render `guard.dialog` and
 * send "Cancel" through `guard.navigate(url)`. Once the form is saved, `when` turns false before
 * the redirect, so the redirect is never asked about.
 *
 * @param when the form has changes that are not saved: leaving the page asks first
 */
export const useUnsavedChangesGuard = (when: boolean): UnsavedChangesGuard => {
    const { t } = useTranslation()
    const router = useRouter()

    const [pending, setPending] = useState<PendingLeave>()

    // Read by the listeners: they are set up once, not on every change of the form
    const whenRef = useRef(when)
    // The visitor chose to leave: the navigation that follows is let through
    const leavingRef = useRef(false)

    useEffect(() => {
        whenRef.current = when
    }, [when])

    const isBlocking = () => whenRef.current && !leavingRef.current

    // Links: caught before Next's <Link> handles the click, so the navigation never starts
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!isBlocking() || event.defaultPrevented || event.button !== 0) {
                return
            }

            // A new tab or window keeps this page as it is
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return
            }

            const anchor = (event.target as Element | null)?.closest?.('a[href]')

            if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== '_self')) {
                return
            }

            const url = new URL(anchor.href, window.location.href)
            const sameDocument =
                url.origin === window.location.origin &&
                url.pathname === window.location.pathname &&
                url.search === window.location.search

            if (anchor.hasAttribute('download') || (sameDocument && url.hash)) {
                return
            }

            event.preventDefault()
            event.stopPropagation()

            setPending({
                kind: 'push',
                url: url.origin === window.location.origin ? url.pathname + url.search + url.hash : url.href
            })
        }

        document.addEventListener('click', handleClick, true)

        return () => document.removeEventListener('click', handleClick, true)
    }, [])

    // Back and forward: the browser has already moved to the other entry; it is put back until
    // the visitor decides
    useEffect(() => {
        const currentState: unknown = window.history.state
        const currentUrl = router.asPath

        router.beforePopState(() => {
            if (!isBlocking()) {
                return true
            }

            window.history.pushState(currentState, '', currentUrl)
            setPending({ kind: 'pop' })

            return false
        })

        return () => router.beforePopState(() => true)
    }, [router])

    // Closing or reloading the tab
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isBlocking()) {
                event.preventDefault()
                event.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])

    const go = (target: PendingLeave) => {
        if (target.kind === 'pop') {
            // The entry the visitor was going back to is right behind the restored one
            window.history.back()
        } else if (target.url.startsWith('/')) {
            void router.push(target.url)
        } else {
            window.location.href = target.url
        }
    }

    const navigate = (url: string) => {
        if (isBlocking()) {
            setPending({ kind: 'push', url })
        } else {
            go({ kind: 'push', url })
        }
    }

    const handleStay = () => setPending(undefined)

    const handleLeave = () => {
        if (!pending) {
            return
        }

        leavingRef.current = true
        setPending(undefined)
        go(pending)
    }

    const dialog = (
        <Dialog
            open={!!pending}
            title={t('components.common.unsaved-changes.title', 'Уйти без сохранения?')}
            maxWidth={'440px'}
            showCloseButton={true}
            onCloseDialog={handleStay}
        >
            <div className={styles.content}>
                <p>
                    {t(
                        'components.common.unsaved-changes.text',
                        'В форме есть несохранённые изменения. Если уйти со страницы, они пропадут.'
                    )}
                </p>
            </div>
            <div className={styles.footer}>
                <Button
                    mode={'secondary'}
                    label={t('components.common.unsaved-changes.stay', 'Остаться')}
                    onClick={handleStay}
                />
                <Button
                    mode={'primary'}
                    variant={'negative'}
                    label={t('components.common.unsaved-changes.leave', 'Уйти без сохранения')}
                    onClick={handleLeave}
                />
            </div>
        </Dialog>
    )

    return { dialog, navigate }
}
