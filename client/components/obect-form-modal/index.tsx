import {
    useGetCategoriesListQuery,
    usePatchCatalogMutation,
    usePostCatalogMutation
} from '@/api/api'
import { APIRequestCatalog, APIResponseError, TCatalog } from '@/api/types'
import isEqual from 'lodash-es/isEqual'
import React, { useState } from 'react'
import { Button, Form, Grid, Message, Modal } from 'semantic-ui-react'

import CelestialMap from '@/components/celestial-map'

import styles from './styles.module.sass'

interface IObjectFormModal {
    visible: boolean
    value?: TCatalog
    skyMapVisible?: boolean
    onClose?: () => void
}

const ObjectFormModal: React.FC<IObjectFormModal> = (props) => {
    const { visible, value, skyMapVisible, onClose } = props

    const { data: categoriesData } = useGetCategoriesListQuery()
    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = usePatchCatalogMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = usePostCatalogMutation()

    const [submitted, setSubmitted] = React.useState<boolean>(false)
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
        onClose?.()
    }

    const isFormDirty = React.useMemo(
        () => isEqual(mapFormProps(value), formState),
        [mapFormProps, value, formState]
    )

    const handleSubmit = React.useCallback(() => {
        setSubmitted(true)

        if (!value?.name) {
            createItem(formState)
        } else {
            updateItem(formState)
        }
    }, [formState])

    React.useEffect(() => {
        setFormState(mapFormProps(value))
    }, [value])

    return (
        <Modal
            size='small'
            open={visible}
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
                        <Grid.Column width={skyMapVisible ? 6 : 16}>
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
                        {skyMapVisible && (
                            <Grid.Column
                                width={10}
                                className={styles.skyMap}
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
                        )}
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
