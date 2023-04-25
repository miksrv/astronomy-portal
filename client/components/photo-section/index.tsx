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

import noPhotoSrc from '@/public/images/no-photo.png'

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
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoLightbox, setPhotoLightbox] = useState<string>('')

    const photoDate = photo ? moment.utc(photo.date).format('D.MM.Y') : '---'

    const exposure =
        !loader && photo?.statistic?.exposure
            ? getTimeFromSec(photo.statistic.exposure, true)
            : '---'
    const filesize =
        !loader && photo?.statistic?.data_size
            ? Math.round((photo.statistic.data_size / 1024) * 100) / 100
            : '---'

    return (
        <div className={classNames(styles.photoSection, 'box')}>
            <Grid>
                <Grid.Column
                    computer={9}
                    tablet={8}
                    mobile={16}
                    className={styles.photoContainer}
                >
                    <div className={styles.loader}>
                        <Dimmer active={!!loader || !photo}>
                            <Loader />
                        </Dimmer>
                    </div>
                    <Image
                        className={styles.photo}
                        alt={title || ''}
                        width={400}
                        height={400}
                        src={
                            !loader && photo
                                ? `${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${photo.image_name}_thumb.${photo.image_ext}`
                                : noPhotoSrc
                        }
                        onClick={() => {
                            if (photo) {
                                setPhotoLightbox(
                                    `${photo.image_name}.${photo.image_ext}`
                                )
                                setShowLightbox(true)
                            }
                        }}
                    />
                    <Button
                        size={'mini'}
                        icon={'download'}
                        color={'green'}
                        className={styles.buttonDownload}
                        href={
                            `${process.env.NEXT_PUBLIC_API_HOST}get/photo/download` +
                            `?object=${photo?.object}&date=${photo?.date}`
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
                                {!!catalog?.files?.length && (
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
                                )}
                            </div>
                            <div>
                                <span className={styles.value}>
                                    Накоплено данных:
                                </span>
                                {filesize} Гб
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
                    <div className={styles.text}>{catalog?.text}</div>
                    <div className={styles.celestialMap}>
                        <CelestialMap
                            objects={
                                catalog
                                    ? [
                                          {
                                              dec: catalog.coord_dec,
                                              name: catalog.name,
                                              ra: catalog.coord_ra
                                          }
                                      ]
                                    : undefined
                            }
                        />
                    </div>
                </Grid.Column>
            </Grid>
            {showLightbox && (
                <Lightbox
                    mainSrc={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photoLightbox}`}
                    onCloseRequest={() => setShowLightbox(false)}
                />
            )}
        </div>
    )
}

export default PhotoSection
