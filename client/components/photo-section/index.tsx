import { imageHost } from '@/api/api'
import { TCatalog, TPhoto } from '@/api/types'
import { getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import moment from 'moment'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import Lightbox from 'react-image-lightbox'
import 'react-image-lightbox/style.css'
import { Button, Dimmer, Grid, Loader } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'
import FilterList from '@/components/filter-list'

import noImageServerUrl from '@/public/images/no-photo.png'

import styles from './styles.module.sass'

type TPhotoItemHeaderProps = {
    loader: boolean
    error?: boolean
    title?: string
    photo?: TPhoto
    catalog?: TCatalog
}

type TPhotoAuthorProps = {
    name?: string
    link?: string
}

const Author: React.FC<TPhotoAuthorProps> = ({ name, link }) =>
    link ? (
        <a
            href={link}
            title={name}
            target='_blank'
            rel='noreferrer'
        >
            {name}
        </a>
    ) : (
        <span>{name || ''}</span>
    )

const PhotoSection: React.FC<TPhotoItemHeaderProps> = ({
    loader,
    title,
    photo,
    catalog
}) => {
    const [photoLightbox, setPhotoLightbox] = useState<string | undefined>(
        undefined
    )

    const photoDate = photo ? moment.utc(photo.date).format('D.MM.Y') : '---'

    const exposure =
        !loader && photo?.statistic?.exposure
            ? getTimeFromSec(photo.statistic.exposure, true)
            : '---'
    const filesize =
        !loader && photo?.statistic?.data_size
            ? Math.round((photo.statistic.data_size / 1024) * 100) / 100
            : undefined

    const imageServerUrl = `${imageHost}photos/`

    return (
        <div className={classNames(styles.section, 'box')}>
            <Grid>
                <Grid.Column
                    computer={9}
                    tablet={8}
                    mobile={16}
                    className={styles.photoContainer}
                >
                    {(!!loader || !photo) && (
                        <div className={styles.loader}>
                            <Dimmer>
                                <Loader />
                            </Dimmer>
                        </div>
                    )}
                    <Image
                        className={styles.photo}
                        alt={title || `Астрофото ${catalog?.name}`}
                        width={400}
                        height={400}
                        src={
                            !loader && photo
                                ? `${imageServerUrl}${photo?.image_name}_thumb.${photo?.image_ext}`
                                : noImageServerUrl
                        }
                        onClick={() => {
                            setPhotoLightbox(
                                `${photo?.image_name}.${photo?.image_ext}`
                            )
                        }}
                    />
                    <Button
                        as={'a'}
                        size={'mini'}
                        icon={'download'}
                        color={'green'}
                        className={styles.buttonDownload}
                        href={
                            `${process.env.NEXT_PUBLIC_API_HOST}photo/download/` +
                            `${photo?.object}/${photo?.date}`
                        }
                    />
                </Grid.Column>
                <Grid.Column
                    computer={7}
                    tablet={8}
                    mobile={16}
                    className={styles.description}
                >
                    <h1>{title}</h1>
                    <Grid className={styles.parameters}>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            <div>
                                <span className={styles.value}>
                                    Дата обработки:
                                </span>
                                {photoDate}
                            </div>
                            <div>
                                <span className={styles.value}>
                                    Экспозиция:
                                </span>
                                {exposure}
                            </div>
                            <div>
                                <span className={styles.value}>Кадров:</span>
                                {photo?.statistic?.frames || '---'}
                                {photo?.statistic?.frames ? (
                                    <span className={styles.marginLeft}>
                                        (
                                        <Link
                                            href={`/objects/${photo?.object}`}
                                            title={''}
                                        >
                                            список
                                        </Link>
                                        )
                                    </span>
                                ) : (
                                    ''
                                )}
                            </div>
                            <div>
                                <span className={styles.value}>
                                    Накоплено данных:
                                </span>
                                {filesize ? `${filesize} Гб` : '---'}
                            </div>
                            <div>
                                <span className={styles.value}>Категория:</span>
                                {catalog?.category_name || '---'}
                            </div>
                            {photo?.author ? (
                                <div>
                                    <span className={styles.value}>
                                        Обработка:
                                    </span>
                                    <Author
                                        name={photo.author?.name}
                                        link={photo.author?.link}
                                    />
                                </div>
                            ) : (
                                ''
                            )}
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            <FilterList filters={photo?.filters} />
                        </Grid.Column>
                    </Grid>
                    <Image
                        src={
                            catalog?.image
                                ? `${imageHost}objects/${catalog.image}`
                                : noImageServerUrl
                        }
                        className={styles.celestialMapImage}
                        width={478}
                        height={240}
                        alt={`${title} - Расположение на астрономической карте`}
                        priority={true}
                    />
                </Grid.Column>
            </Grid>
            {photoLightbox && (
                <Lightbox
                    mainSrc={`${imageServerUrl}${photoLightbox}`}
                    onCloseRequest={() => setPhotoLightbox(undefined)}
                />
            )}
        </div>
    )
}

export default PhotoSection
