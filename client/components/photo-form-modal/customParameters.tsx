import { FilterList, TFilterTypes, TFilters, TFiltersItem } from '@/api/types'
import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import 'react-semantic-ui-datepickers/dist/react-semantic-ui-datepickers.css'
import { Form, Table } from 'semantic-ui-react'

import styles from './styles.module.sass'

type TCustomParameters = {
    initialState?: TFilters
    onChange?: (parameters: TFilters) => void
}

const CustomParameters: React.FC<TCustomParameters> = ({
    initialState,
    onChange
}) => {
    const [parametersState, setParametersState] = useState<TFilters>(
        initialState || {
            blue: {
                exposure: 0,
                frames: 0
            },
            green: {
                exposure: 0,
                frames: 0
            },
            hydrogen: {
                exposure: 0,
                frames: 0
            },
            luminance: {
                exposure: 0,
                frames: 0
            },
            oxygen: {
                exposure: 0,
                frames: 0
            },
            red: {
                exposure: 0,
                frames: 0
            },
            sulfur: {
                exposure: 0,
                frames: 0
            }
        }
    )

    const handleChange = (
        filter: TFilterTypes,
        param: keyof TFiltersItem,
        value: string
    ) => {
        setParametersState({
            ...parametersState,
            [filter]: { ...parametersState[filter], [param]: Number(value) }
        })
    }

    const handleKeyPress = (event: any) => {
        if (!/[0-9]/.test(event.key)) {
            event.preventDefault()
        }
    }

    useEffect(() => {
        onChange?.(parametersState)
    }, [parametersState, onChange])

    return (
        <Table
            unstackable
            className={styles.parametersTable}
            compact={'very'}
            basic={'very'}
            fixed={true}
        >
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell content={'Фильтр'} />
                    <Table.HeaderCell content={'Кадров'} />
                    <Table.HeaderCell content={'Выдержка (сек)'} />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {FilterList.map((filter, key) => (
                    <Table.Row key={key}>
                        <Table.Cell>
                            <span
                                className={classNames(
                                    styles.filterItem,
                                    styles[filter]
                                )}
                            >
                                {filter}
                            </span>
                        </Table.Cell>
                        <Table.Cell>
                            <Form.Input
                                size={'mini'}
                                maxLength={5}
                                className={styles.input}
                                defaultValue={parametersState?.[filter]?.frames}
                                onChange={({ target: { value } }) =>
                                    handleChange(filter, 'frames', value)
                                }
                                onKeyPress={handleKeyPress}
                            />
                        </Table.Cell>
                        <Table.Cell>
                            <Form.Input
                                size={'mini'}
                                maxLength={10}
                                className={styles.input}
                                defaultValue={
                                    parametersState?.[filter]?.exposure
                                }
                                onChange={({ target: { value } }) =>
                                    handleChange(filter, 'exposure', value)
                                }
                                onKeyPress={handleKeyPress}
                            />
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    )
}

export default CustomParameters
