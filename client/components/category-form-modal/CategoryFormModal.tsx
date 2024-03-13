import { API, ApiModel, ApiType } from '@/api'
import isEqual from 'lodash-es/isEqual'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Form, Message, Modal } from 'semantic-ui-react'

import FormModalActions from '@/components/form-modal-actions'

interface CategoryFormModalProps {
    visible: boolean
    value?: ApiModel.Category
    onClose?: () => void
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = (props) => {
    const { visible, value, onClose } = props

    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = API.useCategoryPatchMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = API.useCategoryPostMutation()

    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<ApiModel.Category>(
        mapFormProps(value)
    )

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const findError = (field: keyof ApiModel.Catalog) =>
        (
            (createErrorList as ApiType.ResError) ||
            (updateErrorList as ApiType.ResError)
        )?.messages?.[field] || undefined

    const handleClose = () => {
        setSubmitted(false)
        onClose?.()
    }

    const isFormDirty = useMemo(
        () => isEqual(mapFormProps(value), formState),
        [value, formState]
    )

    const handleSubmit = useCallback(() => {
        setSubmitted(true)

        if (!value?.id) {
            createItem(formState)
        } else {
            updateItem(formState)
        }
    }, [formState, createItem, updateItem, value?.id])

    useEffect(() => {
        setFormState(mapFormProps(value))
    }, [value])

    return (
        <Modal
            size='tiny'
            open={visible}
            onClose={handleClose}
        >
            <Modal.Header>
                {value?.name ? 'Редактирование' : ' Добавления'} категории
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

const mapFormProps = (value?: ApiModel.Category): ApiModel.Category => ({
    id: value?.id ?? 0,
    name: value?.name ?? ''
})

export default CategoryFormModal
