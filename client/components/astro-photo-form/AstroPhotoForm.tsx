import { API, ApiModel } from '@/api'
import { getFilterColor } from '@/tools/colors'
import { formatObjectName } from '@/tools/strings'
import React, { useState } from 'react'
import {
    Button,
    Container,
    Dropdown,
    Input,
    MultiSelect
} from 'simple-react-ui-kit'

import styles from './styles.module.sass'

export type AstroPhotoFormType = {
    categories?: number[]
    objects?: string[]
    equipment?: number[]
    date?: string
    filters?: ApiModel.Filters
    upload?: File
}

interface AstroPhotoFormProps {
    disabled?: boolean
    onSubmit?: (formData?: AstroPhotoFormType) => void
}

const AstroPhotoForm: React.FC<AstroPhotoFormProps> = ({
    disabled,
    onSubmit
}) => {
    const [selectedFilter, setSelectedFilter] = useState<ApiModel.FilterTypes>()
    const [addedFilters, setAddedFilters] = useState<ApiModel.FilterTypes[]>([])
    const [formData, setFormData] = useState<AstroPhotoFormType>({})

    const { data: objectsListData, isLoading: objectsListLoading } =
        API.useObjectsGetListQuery()

    const { data: categoriesListData, isLoading: categoriesListLoading } =
        API.useCategoriesGetListQuery()

    const { data: equipmentListData, isLoading: equipmentListLoading } =
        API.useEquipmentGetListQuery()

    const availableFilters: ApiModel.FilterTypes[] = Object.values(
        ApiModel.filters
    ).filter((filter) => !addedFilters.includes(filter))

    const handleAddFilter = () => {
        if (selectedFilter) {
            setAddedFilters([...addedFilters, selectedFilter])
            setSelectedFilter(undefined)
        }
    }

    const handleRemoveFilter = (filter: ApiModel.FilterTypes) => {
        setAddedFilters((prevFilters) =>
            prevFilters.filter((f) => f !== filter)
        )
        handleFilterChange(filter, 'frames', '')
        handleFilterChange(filter, 'exposure', '')
    }

    const handleFilterChange = (
        filter: ApiModel.FilterTypes,
        field: keyof Omit<ApiModel.Statistic, 'fileSize'>,
        value: string
    ) => {
        setFormData({
            ...formData,
            filters: {
                ...formData?.filters,
                [filter]: {
                    ...formData?.filters?.[filter],
                    [field]: value
                }
            }
        })
    }

    const handleImageUpload = (e: any) => {
        setFormData({ ...formData, upload: e.target.files[0] })
    }

    const handleSubmit = () => {
        onSubmit?.(formData)
    }

    return (
        <Container>
            <MultiSelect<number>
                required={true}
                disabled={disabled}
                className={styles.formElement}
                label={'Категория'}
                notFoundCaption={'Ничего не найдено'}
                placeholder={'Выберите одну или несколько категорий'}
                loading={categoriesListLoading}
                value={formData.categories}
                options={categoriesListData?.items?.map((item) => ({
                    key: item.id,
                    value: item.title
                }))}
                onSelect={(values) =>
                    setFormData({
                        ...formData,
                        categories: values?.map(({ key }) => key)
                    })
                }
            />

            <MultiSelect<string>
                required={true}
                disabled={disabled}
                className={styles.formElement}
                label={'Объекты на фотографии'}
                notFoundCaption={'Ничего не найдено'}
                placeholder={'Выберите объекты, которые есть на фотографии'}
                loading={objectsListLoading}
                value={formData.objects}
                options={objectsListData?.items?.map((item) => ({
                    key: item.name,
                    value: formatObjectName(item.name)
                }))}
                onSelect={(values) =>
                    setFormData({
                        ...formData,
                        objects: values?.map(({ key }) => key)
                    })
                }
            />

            <MultiSelect<number>
                required={true}
                disabled={disabled}
                className={styles.formElement}
                label={'Оборудование'}
                notFoundCaption={'Ничего не найдено'}
                placeholder={'Выберите астрономическое оборудование'}
                loading={equipmentListLoading}
                value={formData.equipment}
                options={equipmentListData?.items?.map((item) => ({
                    key: item.id,
                    value: `${item.brand} ${item.model}`
                }))}
                onSelect={(values) =>
                    setFormData({
                        ...formData,
                        equipment: values?.map(({ key }) => key)
                    })
                }
            />

            <Input
                required={true}
                disabled={disabled}
                className={styles.formElement}
                type={'date'}
                label={'Дата обработки'}
                value={formData.date}
                onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                }
            />

            <div className={styles.addFilter}>
                <Dropdown<ApiModel.FilterTypes>
                    size={'medium'}
                    label={'Параметры съемки'}
                    placeholder={'Добавить фильтр'}
                    value={selectedFilter}
                    className={styles.filtersDropdown}
                    onSelect={(value) => setSelectedFilter(value?.key)}
                    options={availableFilters?.map((filter) => ({
                        key: filter,
                        value: filter
                    }))}
                />

                <Button
                    icon={'PlusCircle'}
                    size={'medium'}
                    disabled={!selectedFilter}
                    onClick={handleAddFilter}
                />
            </div>

            <div className={styles.filterList}>
                {addedFilters.map((filter) => (
                    <div
                        key={filter}
                        className={styles.filterItem}
                        style={{ backgroundColor: getFilterColor(filter) }}
                    >
                        <label>{filter}</label>

                        <Input
                            disabled={disabled}
                            type='number'
                            placeholder='Количество кадров'
                            value={formData?.filters?.[filter]?.frames || ''}
                            onChange={(e) =>
                                handleFilterChange(
                                    filter,
                                    'frames',
                                    e.target.value
                                )
                            }
                        />

                        <Input
                            disabled={disabled}
                            type='number'
                            placeholder='Выдержка (сек)'
                            value={formData?.filters?.[filter]?.exposure || ''}
                            onChange={(e) =>
                                handleFilterChange(
                                    filter,
                                    'exposure',
                                    e.target.value
                                )
                            }
                        />

                        <Button
                            icon={'Close'}
                            size={'medium'}
                            mode={'outline'}
                            onClick={() => handleRemoveFilter(filter)}
                        />
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 15 }}>
                <label>Загрузить изображение:</label>
                <input
                    onChange={handleImageUpload}
                    type={'file'}
                    accept={'image/png, image/gif, image/jpeg'}
                />
            </div>

            <div className={styles.footer}>
                <Button
                    mode={'primary'}
                    variant={'positive'}
                    label={'Сохранить'}
                    disabled={disabled}
                    onClick={handleSubmit}
                />
            </div>
        </Container>
    )
}

export default AstroPhotoForm
