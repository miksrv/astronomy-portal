import React from 'react'
import { Button, Modal } from 'semantic-ui-react'

interface FormModalActionsProps {
    disabled?: boolean
    loading?: boolean
    onClickSave?: () => void
    onClickClose?: () => void
}

const FormModalActions: React.FC<FormModalActionsProps> = ({
    disabled,
    loading,
    onClickSave,
    onClickClose
}) => (
    <Modal.Actions>
        <Button
            size={'tiny'}
            color={'green'}
            onClick={onClickSave}
            disabled={disabled}
            loading={loading}
        >
            {'Сохранить'}
        </Button>
        <Button
            size={'tiny'}
            color={'grey'}
            onClick={onClickClose}
        >
            {'Закрыть'}
        </Button>
    </Modal.Actions>
)

export default FormModalActions
