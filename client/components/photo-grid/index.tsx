import { hosts } from '@/api/constants'
import { TCatalog, TPhoto } from '@/api/types'
import { range, sliceText } from '@/functions/helpers'
import classNames from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Dimmer, Loader, Reveal } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TPhotoGridProps = {
    loading: boolean
    loaderCount?: number
    threeColumns?: boolean
    photos?: TPhoto[]
    catalog?: TCatalog[]
}

const PhotoGrid: React.FC<TPhotoGridProps> = ({
    loading,
    loaderCount,
    threeColumns,
    photos,
    catalog
}) => (
    <div className={classNames(styles.section, 'box')}>
        <PhotosLoader
            visible={loading || !photos || !catalog}
            count={loaderCount || 12}
            threeColumns={threeColumns}
        />
        {photos?.length && !loading
            ? photos?.map((photo) => {
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
              })
            : !loading && (
                  <div className={styles.notFound}>
                      Фотографий объектов по выбранной категории не найдено
                  </div>
              )}
    </div>
)

export const PhotosLoader: React.FC<{
    count: number
    visible?: boolean
    threeColumns?: boolean
}> = ({ count, visible, threeColumns }) => (
    <>
        {visible &&
            range(1, count).map((item) => (
                <div
                    key={item}
                    className={classNames(
                        styles.item,
                        threeColumns ? styles.item4 : undefined
                    )}
                >
                    <div className={styles.info}>
                        <Dimmer active>
                            <Loader />
                        </Dimmer>
                    </div>
                </div>
            ))}
    </>
)

export const PhotoImage: React.FC<{ photo: TPhoto; title: string }> = ({
    photo,
    title
}) => (
    <Image
        src={`${hosts.photo}${photo.image_name}_thumb.${photo.image_ext}`}
        className={styles.photo}
        alt={`${title} Фотография объекта`}
        width={358}
        height={200}
    />
)

export default PhotoGrid
