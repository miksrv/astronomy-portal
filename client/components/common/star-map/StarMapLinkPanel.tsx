import React, { useEffect, useRef } from 'react'
import { Button, Container, Input } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StarMapLinkPanelProps {
    /** The permalink to show; null hides the panel */
    url: string | null
    onClose: () => void
}

/**
 * Manual-copy fallback for the "copy link" toolbar action (FE-6): shown only when both
 * clipboard strategies failed (plain http, a WebView without clipboard access, a denied
 * permission) — the visitor still gets the link, pre-selected, to copy by hand.
 */
const StarMapLinkPanel: React.FC<StarMapLinkPanelProps> = ({ url, onClose }) => {
    const { t } = useTranslation()
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!url) {
            return
        }

        // The kit Input doesn't forward refs — reach the field through the panel node
        const input = panelRef.current?.querySelector('input')
        input?.focus()
        input?.select()
    }, [url])

    if (!url) {
        return null
    }

    return (
        <Container className={styles.linkPanel}>
            <div
                ref={panelRef}
                className={styles.linkPanelBody}
            >
                <div className={styles.linkPanelHint}>
                    {t(
                        'components.common.star-map.copy-link-manual',
                        'Автоматически скопировать не удалось. Скопируйте ссылку вручную:'
                    )}
                </div>
                <Input
                    size={'small'}
                    readOnly={true}
                    value={url}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            onClose()
                        }
                    }}
                />
                <Button
                    size={'small'}
                    mode={'secondary'}
                    onClick={onClose}
                >
                    {t('components.common.star-map.close', 'Закрыть')}
                </Button>
            </div>
        </Container>
    )
}

export default StarMapLinkPanel
