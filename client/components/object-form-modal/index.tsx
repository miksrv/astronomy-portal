import {
    useCatalogPatchMutation,
    useCatalogPostMutation,
    useCategoryGetListQuery
} from '@/api/api'
import { openFormCatalog } from '@/api/applicationSlice'
import { useAppDispatch, useAppSelector } from '@/api/hooks'
import { APIRequestCatalog, APIResponseError, TCatalog } from '@/api/types'
import isEqual from 'lodash-es/isEqual'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form, Grid, Message, Modal } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'

import styles from './styles.module.sass'

const ObjectFormModal: React.FC = () => {
    const dispatch = useAppDispatch()
    const application = useAppSelector((state) => state.application)
    const value = application.editableItemCatalog

    const { data: categoriesData } = useCategoryGetListQuery()
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

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const findError = (field: keyof APIRequestCatalog) =>
        (
            (createErrorList as APIResponseError) ||
            (updateErrorList as APIResponseError)
        )?.messages?.[field] || undefined

    const handleClose = () => {
        setSubmitted(false)
        dispatch(openFormCatalog(false))
    }

    const isFormDirty = useMemo(
        () => isEqual(mapFormProps(value), formState),
        [value, formState]
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
        setFormState(mapFormProps(value))
    }, [value])

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
                    loading={createLoading || updateLoading}
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
                        defaultValue={value?.text}
                        error={findError('text')}
                        rows={7}
                    />
                    <Grid>
                        <Grid.Column width={6}>
                            <Form.Input
                                required
                                name={'name'}
                                label={'Идентификатор'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                defaultValue={value?.name}
                                disabled={!!value?.name}
                                error={findError('name')}
                            />
                            <Form.Input
                                required
                                name={'coord_ra'}
                                label={'RA'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                defaultValue={value?.coord_ra || 0}
                                error={findError('coord_ra')}
                            />
                            <Form.Input
                                required
                                name={'coord_dec'}
                                label={'DEC'}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                defaultValue={value?.coord_dec || 0}
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
            <Modal.Actions>
                <Button
                    size={'tiny'}
                    onClick={handleSubmit}
                    color={'green'}
                    disabled={
                        createLoading ||
                        updateLoading ||
                        !formState?.name ||
                        isFormDirty
                    }
                    loading={createLoading || updateLoading}
                >
                    Сохранить
                </Button>
                <Button
                    size={'small'}
                    onClick={handleClose}
                    color={'grey'}
                >
                    Отмена
                </Button>
            </Modal.Actions>
        </Modal>
    )
}

const mapFormProps = (value?: TCatalog | undefined): APIRequestCatalog => ({
    category: value?.category || 0,
    coord_dec: value?.coord_dec || 0,
    coord_ra: value?.coord_ra || 0,
    name: value?.name || '',
    text: value?.text || '',
    title: value?.title || ''
})

export default ObjectFormModal
