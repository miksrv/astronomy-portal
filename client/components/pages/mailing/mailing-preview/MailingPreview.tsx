import React, { useRef, useState } from 'react'
import { Message, Skeleton } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'

import styles from './styles.module.sass'

interface MailingPreviewProps {
    mailingId: string
}

// Renders the campaign through the exact same `email_newsletter` HTML template
// subscribers receive (image + formatted text + CTA/footer), inside an isolated
// iframe — so admins see the real inbox look instead of the raw subject/content
// fields. The markup is fully server-escaped, so `sandbox` can drop script
// execution entirely while `allow-same-origin` still lets the parent read the
// iframe's content height to auto-size it.
export const MailingPreview: React.FC<MailingPreviewProps> = ({ mailingId }) => {
    const { t } = useTranslation()

    const { data, isLoading, isError } = API.useMailingGetPreviewQuery(mailingId, {
        skip: !mailingId
    })

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [height, setHeight] = useState(0)

    const handleLoad = (): void => {
        const doc = iframeRef.current?.contentDocument

        if (doc?.documentElement) {
            setHeight(doc.documentElement.scrollHeight)
        }
    }

    return (
        <div className={styles.previewSection}>
            {isLoading && <Skeleton style={{ width: '100%', height: '420px', borderRadius: '8px' }} />}

            {isError && (
                <Message type={'error'}>
                    {t('pages.mailing.preview-error', 'Не удалось загрузить превью письма')}
                </Message>
            )}

            {data?.html && (
                <iframe
                    ref={iframeRef}
                    title={t('pages.mailing.preview-title', 'Превью письма')}
                    srcDoc={data.html}
                    sandbox={'allow-same-origin allow-popups'}
                    onLoad={handleLoad}
                    className={styles.previewIframe}
                    style={height ? { height: `${height}px` } : undefined}
                />
            )}
        </div>
    )
}
