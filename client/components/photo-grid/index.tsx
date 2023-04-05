import { TCatalog, TPhoto } from '@/api/types'
import classNames from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Dimmer, Loader, Reveal } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TPhotoGridProps = {
    loading: boolean
    photoList: any
    loaderCount?: number
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
    const { loading, photoList, loaderCount } = props

    const sliceText = (text: string) => {
        let sliced = text.slice(0, 350)

        return sliced + (sliced.length < text.length ? '...' : '')
    }

    return (
        <div className={classNames(styles.photoGird, 'box')}>
            {loading || !photoList
                ? PhotosLoader(loaderCount ? loaderCount : 12)
                : photoList.map((photo: TPhoto & TCatalog) => (
                      <Link
                          key={photo.file}
                          href={`/photos/${photo.object}?date=${photo.date}`}
                          title={`${
                              photo.title || photo.object
                          } - Фотография объекта`}
                          className={styles.item}
                      >
                          {photo.title ? (
                              <Reveal animated={'small fade'}>
                                  <Reveal.Content visible>
                                      <Image
                                          src={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photo.file}_thumb.${photo.ext}`}
                                          className={styles.photo}
                                          alt={photo.title || photo.object}
                                          width={200}
                                          height={200}
                                      />
                                  </Reveal.Content>
                                  <Reveal.Content hidden>
                                      <div className={styles.info}>
                                          <h4>{photo.title}</h4>
                                          <p>{sliceText(photo?.text)}</p>
                                      </div>
                                  </Reveal.Content>
                              </Reveal>
                          ) : (
                              <Image
                                  src={`${process.env.NEXT_PUBLIC_API_HOST}public/photo/${photo.file}_thumb.${photo.ext}`}
                                  className={styles.photo}
                                  alt={''}
                                  width={200}
                                  height={200}
                              />
                          )}
                      </Link>
                  ))}
        </div>
    )
}

export default PhotoGrid
