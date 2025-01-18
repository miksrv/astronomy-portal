import { formatDate } from '@/functions/helpers'
import packageInfo from '@/package.json'
import Image from 'next/image'
import React, { forwardRef } from 'react'

import { update } from '@/update'

import styles from './styles.module.sass'

const AppFooter = forwardRef<HTMLDivElement>((props, ref) => (
    <footer
        className={styles.footer}
        ref={ref}
    >
        <div>Powered by Arduino, PHP + MySQL, NextJS + TS + Redux.</div>
        <div>
            Copyright ©
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
            {formatDate(new Date(), 'YYYY')}, {'v'}
            {packageInfo.version}
            <a
                href={'https://github.com/miksrv/astronomy-portal'}
                rel={'nofollow noindex'}
                className={styles.link}
                title={''}
            >
                {'GitHub'}
            </a>
            ({formatDate(update, 'DD.MM.YYYY, HH:mm')})
        </div>
    </footer>
))

AppFooter.displayName = 'AppFooter'

export default AppFooter
