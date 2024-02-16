'use client'

import {
    useCatalogGetItemQuery,
    useCatalogPatchMutation,
    useCatalogPostMutation,
    useCategoryGetListQuery
} from '@/api/api'
import { openFormCatalog } from '@/api/applicationSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIRequestCatalog, APIResponseError, TCatalog } from '@/api/types'
import isEqual from 'lodash-es/isEqual'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Form, Grid, Message, Modal } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'
import FormModalActions from '@/components/form-modal-actions'

import styles from './styles.module.sass'

const ObjectFormModal: React.FC = () => {
    const dispatch = useAppDispatch()
    const application = useAppSelector((state) => state.application)
    const value = application.editableItemCatalog

    const { data: categoriesData } = useCategoryGetListQuery()
    const { data: catalogData, isFetching } = useCatalogGetItemQuery(
        value?.name || '',
        {
            skip: !value?.name
        }
    )

    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = useCatalogPatchMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = useCatalogPostMutation()

    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<APIRequestCatalog>(
        mapFormProps(value)
    )

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string; target: HTMLInputElement }) => {
        if (e.target.tagName !== 'TEXTAREA' && e.key === 'Enter') {
            handleSubmit()
        }
    }

    const findError = (field: keyof APIRequestCatalog) =>
        (
            (createErrorList as APIResponseError) ||
            (updateErrorList as APIResponseError)
        )?.messages?.[field] || undefined

    const handleClose = () => {
        setFormState(mapFormProps(undefined))
        setSubmitted(false)
        dispatch(openFormCatalog(false))
    }

    const isFormDirty = useMemo(
        () => isEqual(mapFormProps(catalogData), formState),
        [catalogData, formState]
    )

    const handleSubmit = useCallback(() => {
        const canvasImage = document
            ?.getElementById('celestial-map')
            ?.getElementsByTagName('canvas')?.[0]
            ?.toDataURL()

        setSubmitted(true)

        if (!value?.name) {
            createItem({ ...formState, image: canvasImage })
        } else {
            updateItem({ ...formState, image: canvasImage })
        }
    }, [formState, createItem, updateItem, value?.name])

    useEffect(() => {
        setFormState(mapFormProps(catalogData))
    }, [catalogData])

    return (
        <Modal
            size='small'
            open={application.isActiveFormCatalog}
            onClose={handleClose}
        >
            <Modal.Header>
                {value?.name ? 'Редактирование' : ' Создание'} объекта
            </Modal.Header>
            <Modal.Content>
                <Form
                    onSubmit={handleSubmit}
                    loading={createLoading || updateLoading || isFetching}
                    success={(createSuccess || updateSuccess) && submitted}
                    error={(createError || updateError) && submitted}
                    size={'small'}
                >
                    <Message
                        error
                        header={'Ошибка сохранения'}
                        content={
                            'При сохранении объекта были допущены ошибки, проверьте правильность заполнения полей'
                        }
                    />
                    <Message
                        success
                        header={'Объект сохранен'}
                        content={'Все данные объекта успешно сохранены'}
                    />
                    <Form.Input
                        fluid
                        name={'title'}
                        label={'Название'}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        defaultValue={value?.title}
                        error={findError('title')}
                    />
                    <Form.Dropdown
                        placeholder={'Выберите категорию'}
                        fluid
                        search
                        selection
                        value={formState?.category}
                        error={findError('category')}
                        onChange={(e, data) =>
                            setFormState({
                                ...formState,
                                category: data.value as number
                            })
                        }
                        onKeyDown={handleKeyDown}
                        options={categoriesData?.items?.map(({ id, name }) => ({
                            text: name,
                            value: id
                        }))}
                    />
                    <Form.TextArea
                        onChange={(event, data) =>
                            setFormState((prev) => ({
                                ...prev,
                                text: data.value?.toString()!
                            }))
                        }
                        label={'Описание'}
                        onKeyDown={handleKeyDown}
                        defaultValue={formState?.text}
                        error={findError('text')}
                        rows={7}
                    />
                    <Form.Input
                        fluid
                        name={'source_link'}
                        label={'Ссылка на исходные данные (FITS)'}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        defaultValue={formState?.source_link}
                        error={findError('source_link')}
                    />
                    <Grid>
                        <Grid.Column width={6}>
                            <Form.Input
                                required
                                name={'name'}
                                label={'Идентификатор'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                defaultValue={formState?.name}
                                disabled={!!value?.name}
                                error={findError('name')}
                            />
                            <Form.Input
                                required
                                name={'coord_ra'}
                                label={'RA'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                value={formState?.coord_ra || 0}
                                error={findError('coord_ra')}
                            />
                            <Form.Input
                                required
                                name={'coord_dec'}
                                label={'DEC'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                value={formState?.coord_dec || 0}
                                error={findError('coord_dec')}
                            />
                        </Grid.Column>
                        <Grid.Column
                            width={10}
                            className={styles.celestialMap}
                        >
                            <CelestialMap
                                objects={[
                                    {
                                        dec: formState?.coord_dec,
                                        name: formState?.name || '',
                                        ra: formState?.coord_ra
                                    }
                                ]}
                            />
                        </Grid.Column>
                    </Grid>
                </Form>
            </Modal.Content>
            <FormModalActions
                disabled={
                    createLoading ||
                    updateLoading ||
                    !formState?.name ||
                    isFormDirty
                }
                loading={createLoading || updateLoading}
                onClickSave={handleSubmit}
                onClickClose={handleClose}
            />
        </Modal>
    )
}

const mapFormProps = (value?: TCatalog | undefined): APIRequestCatalog => ({
    category: value?.category ?? 0,
    coord_dec: value?.coord_dec ?? 0,
    coord_ra: value?.coord_ra ?? 0,
    name: value?.name ?? '',
    source_link: value?.source_link ?? '',
    text: value?.text ?? '',
    title: value?.title ?? ''
})

export default ObjectFormModal
