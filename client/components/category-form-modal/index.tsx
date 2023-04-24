import { usePatchCategoryMutation, usePostCategoryMutation } from '@/api/api'
import { APIResponseError, TCatalog, TCategory } from '@/api/types'
import isEqual from 'lodash-es/isEqual'
import React, { useState } from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'

interface ICategoryFormModal {
    visible: boolean
    value?: TCategory
    onClose?: () => void
}

const CategoryFormModal: React.FC<ICategoryFormModal> = (props) => {
    const { visible, value, onClose } = props

    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = usePatchCategoryMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = usePostCategoryMutation()

    const [submitted, setSubmitted] = React.useState<boolean>(false)
    const [formState, setFormState] = useState<TCategory>(mapFormProps(value))

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const findError = (field: keyof TCatalog) =>
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

        if (!value?.id) {
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
            size='tiny'
            open={visible}
            onClose={handleClose}
        >
            <Modal.Header>
                {value?.name ? 'Редактирование' : ' Создание'} категории
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
                            'При сохранении категории были допущены ошибки, проверьте правильность заполнения полей'
                        }
                    />
                    <Message
                        success
                        header={'Категория сохранена'}
                        content={'Все данные категории успешно сохранены'}
                    />
                    <Form.Input
                        fluid
                        name={'name'}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        defaultValue={value?.name}
                        error={findError('name')}
                    />
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

const mapFormProps = (value?: TCategory | undefined): TCategory => ({
    id: value?.id || 0,
    name: value?.name || ''
})

export default CategoryFormModal
