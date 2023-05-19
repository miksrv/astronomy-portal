import { useAuthorPatchMutation, useAuthorPostMutation } from '@/api/api'
import { APIResponseError, TAuthor } from '@/api/types'
import isEqual from 'lodash-es/isEqual'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form, Message, Modal } from 'semantic-ui-react'

interface IAuthorFormModal {
    visible: boolean
    value?: TAuthor
    onClose?: () => void
}

const AuthorFormModal: React.FC<IAuthorFormModal> = (props) => {
    const { visible, value, onClose } = props

    const [
        updateItem,
        {
            isLoading: updateLoading,
            isSuccess: updateSuccess,
            isError: updateError,
            error: updateErrorList
        }
    ] = useAuthorPatchMutation()

    const [
        createItem,
        {
            isLoading: createLoading,
            isSuccess: createSuccess,
            isError: createError,
            error: createErrorList
        }
    ] = useAuthorPostMutation()

    const [submitted, setSubmitted] = useState<boolean>(false)
    const [formState, setFormState] = useState<TAuthor>(mapFormProps(value))

    const handleChange = ({
        target: { name, value }
    }: React.ChangeEvent<HTMLInputElement>) =>
        setFormState((prev) => ({ ...prev, [name]: value }))

    const handleKeyDown = (e: { key: string }) =>
        e.key === 'Enter' && handleSubmit()

    const findError = (field: keyof TAuthor) =>
        (
            (createErrorList as APIResponseError) ||
            (updateErrorList as APIResponseError)
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
                {value?.id ? 'Редактирование' : ' Добавление'} автора
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
                            'При сохранении автора были допущены ошибки, проверьте правильность заполнения полей'
                        }
                    />
                    <Message
                        success
                        header={'Автор сохранен'}
                        content={'Все данные автора успешно сохранены'}
                    />
                    <Form.Input
                        fluid
                        name={'name'}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        defaultValue={value?.name}
                        error={findError('name')}
                    />
                    <Form.Input
                        fluid
                        name={'link'}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        defaultValue={value?.link}
                        error={findError('link')}
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

const mapFormProps = (value?: TAuthor | undefined): TAuthor => ({
    id: value?.id ?? 0,
    link: value?.link ?? '',
    name: value?.name ?? ''
})

export default AuthorFormModal
