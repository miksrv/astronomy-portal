import { editPhoto, openFormPhoto } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { TCatalog, TPhoto } from '@/api/types'
import { formatDate, getTimeFromSec } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import Lightbox from 'react-image-lightbox'
import 'react-image-lightbox/style.css'
import { Button, Dimmer, Grid, Icon, Loader } from 'semantic-ui-react'

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

const PhotoSection: React.FC<TPhotoItemHeaderProps> = (props) => {
    const { loader, title, photo, catalog } = props

    const dispatch = useAppDispatch()
    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [photoLightbox, setPhotoLightbox] = useState<string | undefined>(
        undefined
    )

    const photoDate = photo ? formatDate(photo.date, 'D.MM.YYYY') : '---'

    const exposure =
        !loader && photo?.statistic?.exposure
            ? getTimeFromSec(photo.statistic.exposure, true)
            : '---'
    const filesize =
        !loader && photo?.statistic?.data_size
            ? Math.round((photo.statistic.data_size / 1024) * 100) / 100
            : undefined

    const imageSize =
        !loader && photo?.image_size
            ? Math.round((photo.image_size / 1048576) * 100) / 100
            : undefined

    const handleEditPhoto = () => {
        dispatch(editPhoto(photo))
        dispatch(openFormPhoto(true))
    }

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
                                ? `${hosts.photo}${photo?.image_name}_thumb.${photo?.image_ext}`
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
                        color={'yellow'}
                        rel={'nofollow noreferrer'}
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
                    <h1 className={'pageTitle'}>
                        {title}
                        {isAuth && (
                            <span
                                className={styles.controlButton}
                                role={'button'}
                                tabIndex={0}
                                onKeyUp={() => {}}
                                onClick={handleEditPhoto}
                            >
                                <Icon name={'edit outline'} />
                            </span>
                        )}
                    </h1>
                    <Grid className={styles.parameters}>
                        <Grid.Column
                            computer={8}
                            tablet={8}
                            mobile={16}
                        >
                            <div>
                                <span className={styles.value}>Объект:</span>
                                <Link
                                    href={`/objects/${photo?.object}`}
                                    title={''}
                                >
                                    {photo?.object?.replace(/_/g, ' ')}
                                </Link>
                            </div>
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
                                    Сделано кадров:
                                </span>
                                {photo?.statistic?.frames || '---'}
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
                            <div>
                                <span className={styles.value}>
                                    Размер фото:
                                </span>
                                {imageSize ? `${imageSize} Мб` : '---'}
                            </div>
                            <div>
                                <span className={styles.value}>
                                    Разрешение фото:
                                </span>
                                {photo?.image_width} x {photo?.image_height}
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
                                ? `${hosts.maps}${catalog.image}`
                                : noImageServerUrl
                        }
                        className={styles.celestialMapImage}
                        width={478}
                        height={225}
                        alt={`${title} - Расположение на астрономической карте`}
                        priority={true}
                    />
                </Grid.Column>
            </Grid>
            {photoLightbox && (
                <Lightbox
                    mainSrc={`${hosts.photo}${photoLightbox}`}
                    onCloseRequest={() => setPhotoLightbox(undefined)}
                />
            )}
        </div>
    )
}

export default PhotoSection
