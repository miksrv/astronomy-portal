import React from 'react'
import { update } from '@/update'
import { version } from '@/version'

import styles from './styles.module.sass'

const Footer: React.FC = () => {
    return (
        <div className={styles.footer}>
            <div>
                Powered by Arduino, PHP + MySQL, ReactJS + TS + Redux RTK.
            </div>
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
                2023, Version <span>{version}</span> <span>({update})</span>
            </div>
        </div>
    )
}

export default Footer
