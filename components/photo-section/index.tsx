import moment from 'moment'
import React, { useState } from 'react'
import Lightbox from 'react-image-lightbox'
import 'react-image-lightbox/style.css'
import {Button, Dimmer, Grid, Loader} from 'semantic-ui-react'
import Link from "next/link";
import Image from "next/image";
import classNames from "classnames";

import { TCatalog, TPhoto, TPhotoAuthor } from '@/api/types'

import { getTimeFromSec } from '@/functions/helpers'

import FilterList from '@/components/filter-list'
import CelestialMap from '@/components/celestial-map'

import noPhotoSrc from '@/public/images/no-photo.png'
import styles from './styles.module.sass'

type TPhotoItemHeaderProps = {
    loader: boolean
    title?: string
    photo?: TPhoto
    catalog?: TCatalog
}

const Author = (data: TPhotoAuthor) =>
    data.link ? (
        <a
            href={data.link}
            title={data.name}
            target='_blank'
            rel='noreferrer'
        >
            {data.name}
        </a>
    ) : (
        data.name
    )

const PhotoSection: React.FC<TPhotoItemHeaderProps> = ({ loader, title, photo, catalog }) => {
    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoLightbox, setPhotoLightbox] = useState<string>('')

    const photoDate = photo ? moment.utc(photo.date).format('D.MM.Y') : '---'

    const exposure =
        !loader && photo?.parameters
            ? getTimeFromSec(photo.parameters?.exposure, true)
            : '---'
    const filesize =
        !loader && photo?.parameters
            ? Math.round((photo?.parameters.filesizes / 1024) * 100) / 100
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
                                ? `${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photo.file}_thumb.${photo.ext}`
                                : noPhotoSrc
                        }
                        onClick={() => {
                            if (photo) {
                                setPhotoLightbox(`${photo.file}.${photo.ext}`)
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
                    <h1>
                        {title}
                    </h1>
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
                                    <span className={styles.value}>
                                        Кадров:
                                    </span>
                                {photo?.parameters?.frames || '---'}
                                {photo?.parameters && (
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
                                    <span className={styles.value}>
                                        Категория:
                                    </span>
                                {catalog?.category || '---'}
                            </div>
                            {photo?.author && (
                                <div>
                                        <span className={styles.value}>
                                            Обработка:
                                        </span>
                                    {Author(photo.author)}
                                </div>
                            )}
                        </Grid.Column>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            {!loader && photo?.parameters?.filters && (
                                <FilterList
                                    filters={photo.parameters?.filters}
                                />
                            )}
                        </Grid.Column>
                    </Grid>
                    <div className={styles.text}>{catalog?.text}</div>
                    <div className={styles.celestialMap}>
                        <CelestialMap
                            objects={
                                catalog && photo
                                    ? [
                                          {
                                              dec: catalog.dec,
                                              name: photo.object,
                                              ra: catalog.ra
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
