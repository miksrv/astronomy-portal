import { TCatalog, TPhoto } from '@/api/types'
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

const PhotosLoader = (count: number) =>
    Array(count)
        .fill(1)
        .map((item, key) => (
            <div
                key={key}
                className={styles.item}
            >
                <div className={styles.info}>
                    <Dimmer active>
                        <Loader />
                    </Dimmer>
                </div>
            </div>
        ))

const PhotoGrid: React.FC<TPhotoGridProps> = (props) => {
    const { loading, loaderCount, threeColumns, photos, catalog } = props

    const sliceText = (text: string) => {
        let sliced = text.slice(0, 350)

        return sliced + (sliced.length < text.length ? '...' : '')
    }

    return (
        <div className={classNames(styles.photoGird, 'box')}>
            {loading || !photos || !catalog
                ? PhotosLoader(loaderCount ? loaderCount : 12)
                : photos.map((photo) => {
                      const catalogItem = catalog.find(
                          ({ name }) => name === photo.object
                      )

                      return (
                          <Link
                              key={photo.id}
                              href={`/photos/${photo.object}?date=${photo.date}`}
                              title={`${
                                  photo.object || photo.object
                              } - Фотография объекта`}
                              className={classNames(
                                  styles.item,
                                  threeColumns ? styles.item4 : undefined
                              )}
                          >
                              {catalogItem?.title ? (
                                  <Reveal animated={'small fade'}>
                                      <Reveal.Content visible>
                                          <Image
                                              src={`${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${photo.image_name}_thumb.${photo.image_ext}`}
                                              className={styles.photo}
                                              alt={catalogItem.title}
                                              width={200}
                                              height={200}
                                          />
                                      </Reveal.Content>
                                      <Reveal.Content hidden>
                                          <div className={styles.info}>
                                              <h4>{catalogItem.title}</h4>
                                              <p>
                                                  {sliceText(catalogItem?.text)}
                                              </p>
                                          </div>
                                      </Reveal.Content>
                                  </Reveal>
                              ) : (
                                  <Image
                                      src={`${process.env.NEXT_PUBLIC_IMG_HOST}public/photo/${photo.image_name}_thumb.${photo.image_ext}`}
                                      className={styles.photo}
                                      alt={''}
                                      width={200}
                                      height={200}
                                  />
                              )}
                          </Link>
                      )
                  })}
        </div>
    )
}

export default PhotoGrid
