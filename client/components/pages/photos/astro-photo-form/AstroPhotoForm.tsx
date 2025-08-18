import React, { useEffect, useState } from 'react'
import { Button, Container, Dropdown, Input, MultiSelect } from 'simple-react-ui-kit'

import Image from 'next/image'

import { API, ApiModel } from '@/api'
import { getFilterColor } from '@/utils/colors'
import { createLargePhotoUrl } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'

import styles from './styles.module.sass'

export type AstroPhotoFormType = Partial<ApiModel.Photo> & {
    upload?: File
}

// Preset equipment sets
const equipmentPresets = [
    { name: 'HEQ5 + ASI1600', equipments: [1, 5, 7, 10, 12, 14, 15, 17] },
    { name: 'EQ6 + ASI6200', equipments: [2, 5, 8, 11, 13, 14, 16, 18] },
    { name: 'Dob + Canon', equipments: [4, 9] }
]

interface AstroPhotoFormProps {
    disabled?: boolean
    initialData?: AstroPhotoFormType
    onSubmit?: (formData?: AstroPhotoFormType) => void
    onCancel?: () => void
}

export const AstroPhotoForm: React.FC<AstroPhotoFormProps> = ({ disabled, initialData, onSubmit, onCancel }) => {
    const [selectedFilter, setSelectedFilter] = useState<ApiModel.FilterTypes>()
    const [addedFilters, setAddedFilters] = useState<ApiModel.FilterTypes[]>([])
    const [formData, setFormData] = useState<AstroPhotoFormType>({})

    const { data: objectsListData, isLoading: objectsListLoading } = API.useObjectsGetListQuery()

    const { data: categoriesListData, isLoading: categoriesListLoading } = API.useCategoriesGetListQuery()

    const { data: equipmentListData, isLoading: equipmentListLoading } = API.useEquipmentsGetListQuery()

    const availableFilters: ApiModel.FilterTypes[] = Object.values(ApiModel.filters).filter(
        (filter) => !addedFilters.includes(filter)
    )

    const handleAddFilter = () => {
        if (selectedFilter) {
            setAddedFilters([...addedFilters, selectedFilter])
            setSelectedFilter(undefined)
        }
    }

    const handleRemoveFilter = (filter: ApiModel.FilterTypes) => {
        setAddedFilters((prevFilters) => prevFilters.filter((f) => f !== filter))
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, upload: e?.target?.files?.[0] })
    }

    const handleSubmit = () => {
        onSubmit?.(formData)
    }

    useEffect(() => {
        if (initialData) {
            const transformedFilters = initialData.filters
                ? (Object.keys(initialData.filters) as ApiModel.FilterTypes[])
                : []

            setAddedFilters(transformedFilters)
            setFormData({
                ...initialData,
                filters: transformedFilters.reduce(
                    (acc, filter) => {
                        acc[filter] = {
                            ...initialData?.filters?.[filter],
                            exposure: initialData?.filters?.[filter]?.exposure
                                ? initialData.filters[filter].exposure / 60
                                : 0
                        }
                        return acc
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {} as Record<ApiModel.FilterTypes, any>
                )
            })
        }
    }, [initialData])

    return (
        <Container>
            <MultiSelect<number>
                required={true}
                closeOnSelect={true}
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
                closeOnSelect={true}
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
                value={formData.equipments}
                options={equipmentListData?.items?.map((item) => ({
                    key: item.id,
                    value: `${item.brand} ${item.model}`
                }))}
                onSelect={(values) =>
                    setFormData({
                        ...formData,
                        equipments: values?.map(({ key }) => key)
                    })
                }
            />

            <EquipmentPresets onSelect={(equipments) => setFormData({ ...formData, equipments })} />

            <Input
                required={true}
                disabled={disabled}
                className={styles.formElement}
                size={'medium'}
                type={'date'}
                label={'Дата обработки'}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <div className={styles.addFilter}>
                <Dropdown<ApiModel.FilterTypes>
                    size={'medium'}
                    label={'Параметры съемки'}
                    placeholder={'Добавить фильтр'}
                    mode={'secondary'}
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
                            onChange={(e) => handleFilterChange(filter, 'frames', e.target.value)}
                        />

                        <Input
                            disabled={disabled}
                            type={'number'}
                            placeholder={'Выдержка (минут)'}
                            value={formData?.filters?.[filter]?.exposure || ''}
                            onChange={(e) => handleFilterChange(filter, 'exposure', e.target.value)}
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

            <div className={styles.imageSection}>
                {!!initialData?.fileName && (
                    <Image
                        className={styles.image}
                        src={createLargePhotoUrl(initialData as ApiModel.Photo)}
                        fill={true}
                        alt={''}
                    />
                )}
            </div>
            <div style={{ marginTop: 15 }}>
                <label>{initialData?.fileName ? 'Заменить фотографию:' : 'Загрузить фотографию:'}</label>
                <input
                    onChange={handleImageUpload}
                    type={'file'}
                    disabled={disabled}
                    accept={'image/png, image/gif, image/jpeg'}
                />
            </div>

            <div className={styles.footer}>
                <Button
                    mode={'secondary'}
                    label={'Отмена'}
                    disabled={disabled}
                    onClick={onCancel}
                />

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

const EquipmentPresets: React.FC<{
    onSelect: (equipments: number[]) => void
}> = ({ onSelect }) => (
    <div className={styles.presets}>
        {equipmentPresets.map((preset) => (
            <Button
                key={preset.name}
                label={preset.name}
                mode={'link'}
                onClick={() => onSelect(preset.equipments)}
            />
        ))}
    </div>
)
