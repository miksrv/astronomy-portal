import packageInfo from '@/package.json'
import moment from 'moment/moment'
import Image from 'next/image'
import React from 'react'

import { update } from '@/update'

import styles from './styles.module.sass'

const Footer: React.FC = () => (
    <footer
        className={styles.footer}
        data-testid={'footer'}
    >
        <div>Powered by Arduino, PHP + MySQL, NextJS + TS + Redux.</div>
        <div>
            Copyright ©
            <a
                href={'https://miksoft.pro'}
                className={styles.copyrightLink}
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
            </a>{' '}
            {moment().format('Y')}, Version <span>{packageInfo.version}</span>{' '}
            <span>({update})</span>
        </div>
    </footer>
)

export default Footer
