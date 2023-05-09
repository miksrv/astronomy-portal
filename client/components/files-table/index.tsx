import { imageHost } from '@/api/api'
import { TFIle } from '@/api/types'
import classNames from 'classnames'
import React, { useCallback, useEffect, useState } from 'react'
import Lightbox from 'react-image-lightbox'
import { Accordion, Dimmer, Icon, Loader, Table } from 'semantic-ui-react'

import RenderTableHeader from './RenderTableHeader'
import RenderTableRow from './RenderTableRow'
import styles from './styles.module.sass'
import { TObjectSortable, TSortOrdering } from './types'

type TFilesTableProps = {
    loader: boolean
    objectName: string
    files?: TFIle[]
}

const FilesTable: React.FC<TFilesTableProps> = (props) => {
    const { files, objectName, loader } = props

    const [showLightbox, setShowLightbox] = useState<boolean>(false)
    const [photoIndex, setCurrentIndex] = useState<number>(0)
    const [photoList, setPhotoList] = useState<string[]>([])
    const [sortField, setSortField] = useState<TObjectSortable>('date_obs')
    const [sortOrder, setSortOrder] = useState<TSortOrdering>('ascending')
    const [showSpoiler, setShowSpoiler] = useState<boolean>(false)
    const [filesList, setFilesList] = useState<TFIle[] | undefined>(files)

    const handlerSortClick = (field: TObjectSortable) => {
        if (sortField !== field) setSortField(field)
        else
            setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending')
    }

    const handlePhotoClick = (photoId: number) => {
        setCurrentIndex(photoId)
        setShowLightbox(true)
    }

    const doSortObjects = useCallback(() => {
        const sortingFilesList = [...(files || [])].sort((a, b) =>
            sortOrder === 'descending'
                ? a[sortField] > b[sortField]
                    ? 1
                    : -1
                : a[sortField] < b[sortField]
                ? 1
                : -1
        )

        setFilesList(sortingFilesList || [])
    }, [files, sortOrder, sortField])

    const showAdditionalInfo: boolean = !!filesList?.filter(
        ({ star_count }) => star_count
    )?.length

    const showPreview: boolean = !!filesList?.filter(({ preview }) => preview)
        ?.length

    const imageUrl = (index: number) =>
        `${imageHost}uploads/${objectName}/${photoList[index]}.jpg`

    useEffect(() => {
        const photoList = filesList
            ?.filter((file) => file.preview)
            .map(({ file_name }) => `${file_name}`)

        setPhotoList(photoList || [])
    }, [filesList, objectName])

    useEffect(() => {
        doSortObjects()
    }, [files, sortField, sortOrder, doSortObjects])

    return (
        <div className={classNames(styles.section, 'box', 'table')}>
            <Dimmer active={loader}>
                <Loader />
            </Dimmer>
            <Accordion inverted>
                <Accordion.Title
                    active={showSpoiler}
                    onClick={() => setShowSpoiler(!showSpoiler)}
                >
                    <Icon name={'dropdown'} /> Список снятых кадров
                </Accordion.Title>
                <Accordion.Content active={showSpoiler}>
                    <Table
                        unstackable
                        singleLine
                        sortable
                        celled
                        inverted
                        selectable
                        compact
                    >
                        <RenderTableHeader
                            sort={sortField}
                            order={sortOrder}
                            showPreview={showPreview}
                            showAdditional={showAdditionalInfo}
                            handlerSortClick={(field: TObjectSortable) =>
                                handlerSortClick(field)
                            }
                        />
                        <Table.Body>
                            {filesList?.length ? (
                                filesList?.map((file, key) => (
                                    <RenderTableRow
                                        key={file.file_name}
                                        file={file}
                                        itemId={key}
                                        object={objectName}
                                        showPreview={showPreview}
                                        showAdditional={showAdditionalInfo}
                                        onPhotoClick={handlePhotoClick}
                                    />
                                ))
                            ) : (
                                <Table.Row>
                                    <Table.Cell
                                        textAlign={'center'}
                                        colSpan={10}
                                        content={
                                            'Нет загруженных файлов для этого объекта'
                                        }
                                    />
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                </Accordion.Content>
            </Accordion>
            {showLightbox && photoList.length && (
                <Lightbox
                    mainSrc={imageUrl(photoIndex)}
                    nextSrc={imageUrl((photoIndex + 1) % photoList.length)}
                    imageTitle={photoList[photoIndex]}
                    prevSrc={imageUrl(
                        (photoIndex + photoList.length - 1) % photoList.length
                    )}
                    onCloseRequest={() => setShowLightbox(false)}
                    onMovePrevRequest={() =>
                        setCurrentIndex(
                            (photoIndex + photoList.length - 1) %
                                photoList.length
                        )
                    }
                    onMoveNextRequest={() =>
                        setCurrentIndex((photoIndex + 1) % photoList.length)
                    }
                />
            )}
        </div>
    )
}

export default FilesTable
