import { API, ApiModel, ApiType, useAppDispatch, useAppSelector } from '@/api'
import { openFormPhoto } from '@/api/applicationSlice'
import { hosts } from '@/api/constants'
import { formatDate } from '@/functions/helpers'
import isEqual from 'lodash-es/isEqual'
import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import SemanticDatepicker from 'react-semantic-ui-datepickers'
import 'react-semantic-ui-datepickers/dist/react-semantic-ui-datepickers.css'
import { Button, Checkbox, Form, Grid, Message, Modal } from 'semantic-ui-react'

import FormModalActions from '@/components/form-modal-actions'

import CustomParameters from './CustomParameters'
import styles from './styles.module.sass'

const PhotoFormModal: React.FC = () => {
    const dispatch = useAppDispatch()

    const application = useAppSelector((state) => state.application)
    const value = application.editableItemPhoto

    const { data: catalogData } = API.useStatisticGetCatalogItemsQuery()
    const { data: authorsData } = API.useAuthorGetListQuery()
    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = API.usePhotoPatchMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = API.usePhotoPostMutation()

    const [
        uploadPhoto,
        {
            data: uploadData,
            isLoading: uploadLoading,
            isSuccess: uploadSuccess
            // isError: uploadError,
            // error: uploadErrorList
        }
    ] = API.usePhotoPostUploadMutation()

    const [file, setFile] = useState<File | undefined>()
    const [filters, setFilters] = useState<ApiModel.Filter.ListItems>()
    const [useCustomParam, setUseCustomParam] = useState<boolean>(false)
    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<ApiType.Photo.ReqSet>(
        mapFormProps(value)
    )

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const findError = (field: keyof ApiType.Photo.ReqSet) =>
        (
            (createErrorList as ApiType.ResError) ||
            (updateErrorList as ApiType.ResError)
        )?.messages?.[field] || undefined

    const handleClose = () => {
        setSubmitted(false)
        dispatch(openFormPhoto(false))
    }

    const isFormDirty = useMemo(
        () => isEqual(mapFormProps(value), formState) && !filters,
        [value, formState, filters]
    )

    const handleSubmit = useCallback(() => {
        setSubmitted(true)

        const photoData = {
            ...formState,
            filters: useCustomParam ? filters : undefined
        }

        if (!value?.id) {
            createItem(photoData)
        } else {
            updateItem(photoData)
        }
    }, [useCustomParam, formState, createItem, updateItem, filters, value?.id])

    useEffect(() => {
        setFormState(mapFormProps(value))
        setUseCustomParam(value?.custom || false)

        if (value?.custom === true) {
            setFilters(value.filters)
        }
    }, [value])

    useEffect(() => {
        if (uploadData && uploadSuccess) {
            const uploadPhotoResult = uploadData as ApiType.Photo.ResUpload

            setFormState({
                ...formState,
                image_ext: uploadPhotoResult.image_ext,
                image_name: uploadPhotoResult.image_name
            })
        }
    }, [uploadData, uploadSuccess, formState])

    const handleUpload = () => {
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        uploadPhoto(formData)
    }

    return (
        <Modal
            size='small'
            open={application.isActiveFormPhoto}
            onClose={handleClose}
        >
            <Modal.Header>
                {value?.id ? 'Редактирование' : ' Создание'} объекта
            </Modal.Header>
            <Modal.Content>
                <Form
                    onSubmit={handleSubmit}
                    loading={createLoading || updateLoading}
                    success={(createSuccess || updateSuccess) && submitted}
                    error={(createError || updateError) && submitted}
                    size={'small'}
                >
                    <Message
                        error
                        header={'Ошибка сохранения'}
                        content={
                            'При сохранении фотографии были допущены ошибки, проверьте правильность заполнения полей'
                        }
                    />
                    <Message
                        success
                        header={'Объект сохранен'}
                        content={'Все данные фотографии успешно сохранены'}
                    />
                    <Grid>
                        <Grid.Column width={9}>
                            <Form.Dropdown
                                placeholder={'Выберите объект каталога'}
                                fluid
                                search
                                selection
                                value={formState?.object}
                                error={findError('object')}
                                onChange={(e, data) =>
                                    setFormState({
                                        ...formState,
                                        object: data.value as string
                                    })
                                }
                                onKeyDown={handleKeyDown}
                                options={catalogData?.items?.map((name) => ({
                                    text: name,
                                    value: name
                                }))}
                            />
                            <Form.Dropdown
                                placeholder={'Выберите автора фотографии'}
                                fluid
                                search
                                selection
                                value={formState?.author_id}
                                error={findError('author_id')}
                                onChange={(e, data) =>
                                    setFormState({
                                        ...formState,
                                        author_id: data.value as number
                                    })
                                }
                                onKeyDown={handleKeyDown}
                                options={authorsData?.items?.map(
                                    ({ id, name }) => ({
                                        text: name,
                                        value: id
                                    })
                                )}
                            />
                            <SemanticDatepicker
                                required
                                name={'date'}
                                label={'Дата обработки'}
                                clearable={false}
                                value={
                                    value?.date
                                        ? new Date(value.date)
                                        : undefined
                                }
                                className={styles.calendarInput}
                                onChange={(event, data) =>
                                    setFormState({
                                        ...formState,
                                        date: formatDate(
                                            data.value as Date,
                                            'YYYY-MM-DD'
                                        )!
                                    })
                                }
                                error={findError('date')}
                                showToday={false}
                            />
                            <Checkbox
                                checked={useCustomParam}
                                label={'Использовать свои параметры фотографии'}
                                onChange={() =>
                                    setUseCustomParam(!useCustomParam)
                                }
                            />
                        </Grid.Column>
                        <Grid.Column width={7}>
                            {value?.image_name && value?.image_ext ? (
                                <Image
                                    src={`${hosts.photo}${value.image_name}_thumb.${value.image_ext}`}
                                    alt={'Загруженная фотография объекта'}
                                    width={265}
                                    height={200}
                                />
                            ) : formState.image_name && uploadSuccess ? (
                                <Image
                                    src={`${hosts.temp}${formState.image_name}_thumb.${formState.image_ext}`}
                                    alt={'Загруженная фотография объекта'}
                                    width={265}
                                    height={200}
                                />
                            ) : (
                                <>
                                    <input
                                        type='file'
                                        onChange={(e) =>
                                            setFile(e?.target?.files?.[0])
                                        }
                                    />
                                    <Button
                                        size={'small'}
                                        onClick={handleUpload}
                                        color={'grey'}
                                        loading={uploadLoading}
                                        disabled={uploadLoading}
                                    >
                                        Загрузить
                                    </Button>
                                </>
                            )}
                        </Grid.Column>
                    </Grid>
                    {useCustomParam && (
                        <CustomParameters
                            onChange={setFilters}
                            initialState={
                                value?.custom ? value?.filters : undefined
                            }
                        />
                    )}
                </Form>
            </Modal.Content>
            <FormModalActions
                disabled={
                    createLoading ||
                    updateLoading ||
                    !formState?.image_name ||
                    isFormDirty
                }
                loading={createLoading || updateLoading}
                onClickSave={handleSubmit}
                onClickClose={handleClose}
            />
        </Modal>
    )
}

const mapFormProps = (value?: ApiModel.Photo): ApiType.Photo.ReqSet => ({
    author_id: value?.author?.id ?? 0,
    date: value?.date ?? '',
    id: value?.id ?? 0,
    image_ext: value?.image_ext ?? '',
    image_name: value?.image_name ?? '',
    object: value?.object ?? ''
})

export default PhotoFormModal
