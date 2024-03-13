import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { sliceText } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Reveal } from 'semantic-ui-react'

import styles from './styles.module.sass'

interface PhotoGridProps {
    threeColumns?: boolean
    photos?: ApiModel.Photo[]
    catalog?: ApiModel.Catalog[]
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
    threeColumns,
    photos,
    catalog
}) => (
    <div className={classNames(styles.section, 'box')}>
        {!photos?.length && (
            <div className={styles.notFound}>
                {'Ничего не найдено, попробуйте изменить условия поиска.'}
            </div>
        )}

        {photos?.map((photo) => {
            const catalogItem = catalog?.find(
                ({ name }) => name === photo.object
            )

            return (
                <Link
                    key={photo.id}
                    href={`/photos/${photo.object}?date=${photo.date}`}
                    title={`${photo.object} - Фотография объекта`}
                    className={classNames(
                        styles.item,
                        threeColumns ? styles.item4 : undefined
                    )}
                >
                    {catalogItem?.title ? (
                        <Reveal animated={'small fade'}>
                            <Reveal.Content visible>
                                <PhotoImage
                                    photo={photo}
                                    title={catalogItem.title}
                                />
                            </Reveal.Content>
                            <Reveal.Content hidden>
                                <div className={styles.info}>
                                    <h4>{catalogItem.title}</h4>
                                    <p>{sliceText(catalogItem?.text)}</p>
                                </div>
                            </Reveal.Content>
                        </Reveal>
                    ) : (
                        <PhotoImage
                            photo={photo}
                            title={catalogItem?.name ?? ''}
                        />
                    )}
                </Link>
            )
        })}
    </div>
)

interface PhotoImageProps {
    photo: ApiModel.Photo
    title: string
}

export const PhotoImage: React.FC<PhotoImageProps> = ({ photo, title }) => (
    <Image
        src={`${hosts.photo}${photo.image_name}_thumb.${photo.image_ext}`}
        className={styles.photo}
        alt={`${title} Фотография объекта`}
        width={300}
        height={200}
    />
)

export default PhotoGrid
