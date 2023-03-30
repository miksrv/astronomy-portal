import React from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'
import Link from "next/link";

import styles from './ObjectCloud.module.sass'

type TObjectCloudProps = {
    loader: boolean
    current: string
    names: string[] | undefined
    link: string
}

const ObjectCloud: React.FC<TObjectCloudProps> = (props) => {
    const { loader, current, names, link } = props

    return (
        <div className='box object-cloud'>
            {loader ? (
                <>
                    <Dimmer active>
                        <Loader />
                    </Dimmer>
                    <div>Загрузка...</div>
                </>
            ) : (
                names?.map((item) => (
                    <Link
                        href={`/${link}/${item}`}
                        className={current === item ? 'active' : ''}
                        key={item}
                        title={''}
                    >
                        {item.replace(/_/g, ' ')}
                    </Link>
                ))
            )}
        </div>
    )
}

export default ObjectCloud
