import React, { useEffect, useState } from 'react'
import { Button, cn, Message } from 'simple-react-ui-kit'

import { useAppDispatch, useAppSelector } from '@/api'
import { dismissSnackbar, SnackbarItem, SnackbarType } from '@/api/applicationSlice'

import styles from './styles.module.sass'

const DEFAULT_DURATION: Record<SnackbarType, number> = {
    info: 5000,
    success: 5000,
    warning: 7000,
    error: 8000
}

// Time the fade/slide-out transition (styles.module.sass) needs to finish
// before the entry is actually removed from the store.
const CLOSE_TRANSITION_MS = 200

const SnackbarEntry: React.FC<{ item: SnackbarItem }> = ({ item }) => {
    const dispatch = useAppDispatch()
    const [closing, setClosing] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => setClosing(true), item.duration ?? DEFAULT_DURATION[item.type])
        return () => window.clearTimeout(timer)
        // Auto-dismiss timer is one-shot by design - it must not restart on
        // every render, only on mount.
    }, [])

    useEffect(() => {
        if (!closing) {
            return
        }

        const timer = window.setTimeout(() => dispatch(dismissSnackbar(item.id)), CLOSE_TRANSITION_MS)
        return () => window.clearTimeout(timer)
    }, [closing, dispatch, item.id])

    return (
        <div className={cn(styles.entry, closing && styles.closing)}>
            <Message type={item.type}>
                <div className={styles.entryContent}>
                    <span>{item.message}</span>
                    <Button
                        type={'button'}
                        mode={'link'}
                        icon={'Close'}
                        aria-label={'Закрыть уведомление'}
                        onClick={() => setClosing(true)}
                    />
                </div>
            </Message>
        </div>
    )
}

/**
 * Stack of toast-style notifications for feedback that isn't tied to a
 * specific form field (a generic save error, a save confirmation) - see
 * `useSnackbar`. Mounted once in `AppLayout`, positioned fixed so it stays
 * visible regardless of scroll position.
 */
export const SnackbarStack: React.FC = () => {
    const snackbars = useAppSelector((store) => store.application.snackbars)

    if (!snackbars.length) {
        return null
    }

    return (
        <div
            className={styles.stack}
            role={'region'}
            aria-live={'polite'}
            aria-label={'Уведомления'}
        >
            {snackbars.map((item: SnackbarItem) => (
                <SnackbarEntry
                    key={item.id}
                    item={item}
                />
            ))}
        </div>
    )
}

export default SnackbarStack
