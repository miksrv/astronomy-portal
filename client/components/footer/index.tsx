import packageInfo from '@/package.json'
import moment from 'moment/moment'
import React from 'react'

import { update } from '@/update'

import styles from './styles.module.sass'

const Footer: React.FC = () => (
    <div className={styles.footer}>
        <div>Powered by Arduino, PHP + MySQL, NextJS + TS + Redux.</div>
        <div>
            Copyright ©
            <a
                href={'https://miksoft.pro'}
                className={styles.copyrightLink}
                title={''}
            >
                <img
                    src={'https://miksoft.pro/favicon.ico'}
                    alt={''}
                />{' '}
                Mik
            </a>{' '}
            {moment().format('Y')}, Version <span>{packageInfo.version}</span>{' '}
            <span>({update})</span>
        </div>
    </div>
)

export default Footer
