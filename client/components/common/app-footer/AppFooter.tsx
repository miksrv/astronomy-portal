import React, { forwardRef } from 'react'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import packageInfo from '@/package.json'
import { update } from '@/update'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

export const AppFooter = forwardRef<HTMLDivElement>((props, ref) => {
    const { t } = useTranslation()

    return (
        <footer
            className={styles.footer}
            ref={ref}
        >
            <div className={styles.copyright}>
                {'Copyright ©'}
                <a
                    href={'https://miksoft.pro'}
                    className={styles.link}
                    title={''}
                >
                    <Image
                        className={styles.copyrightImage}
                        src={'https://miksoft.pro/favicon.ico'}
                        alt={''}
                        width={11}
                        height={11}
                    />
                    {'Mik'}
                </a>
                {formatDate(new Date(), 'YYYY')},{' v'}
                {packageInfo.version}
                <a
                    href={'https://github.com/miksrv/astronomy-portal'}
                    rel={'nofollow noindex'}
                    className={styles.link}
                    title={''}
                >
                    {'GitHub'}
                </a>
                {`(${formatDate(update, 'DD.MM.YYYY, HH:mm')})`}
            </div>

            <div className={styles.madeWithLove}>
                {t('components.common.app-footer.made-with-love', 'Сделано с любовью к звёздам')}
                <svg
                    className={styles.starIcon}
                    viewBox={'0 0 24 24'}
                    xmlns={'http://www.w3.org/2000/svg'}
                    aria-hidden={'true'}
                >
                    <path d={'M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z'} />
                </svg>
            </div>
        </footer>
    )
})

AppFooter.displayName = 'AppFooter'
