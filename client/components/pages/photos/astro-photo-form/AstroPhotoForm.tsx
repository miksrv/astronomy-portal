import React, { useEffect, useMemo, useState } from 'react'
import { Controller, FieldErrors, useFieldArray, useForm } from 'react-hook-form'
import { Button, Container, Input, Select } from 'simple-react-ui-kit'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import Image from 'next/image'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { DateTimeInput } from '@/components/ui/date-time-input'
import useApiFormError from '@/hooks/useApiFormError'
import useScrollToApiFieldErrors from '@/hooks/useScrollToApiFieldErrors'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import { getFilterColor } from '@/utils/colors'
import { flattenFieldErrorPaths, scrollToFirstFieldError } from '@/utils/formErrorScroll'
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

const FILTER_KEYS = Object.keys(ApiModel.filters) as ApiModel.FilterTypes[]

interface AstroPhotoFormProps {
    disabled?: boolean
    initialData?: AstroPhotoFormType
    /** RTK Query error from the create/patch mutation — shown inline next to the field it belongs to. */
    error?: unknown
    onSubmit?: (formData?: AstroPhotoFormType) => void
    onCancel?: () => void
}

interface AstroPhotoFilterFormValue {
    filter: ApiModel.FilterTypes
    // Kept as plain `number` (never `undefined`) so the form stays fully-typed -
    // an empty field is represented as `NaN` (what `parseFloat('')` already
    // produces), which zod's `z.number()` rejects as an invalid type just like
    // a missing value would be (see AstroObjectForm's RA/DEC fields).
    frames: number
    exposure: number
}

interface AstroPhotoFormValues {
    categories: number[]
    objects: string[]
    equipments: number[]
    date: string
    filters: AstroPhotoFilterFormValue[]
    upload?: File
}

export const AstroPhotoForm: React.FC<AstroPhotoFormProps> = ({ disabled, initialData, error, onSubmit, onCancel }) => {
    const { t } = useTranslation()

    const [selectedFilter, setSelectedFilter] = useState<ApiModel.FilterTypes>()

    const { data: objectsListData, isLoading: objectsListLoading } = API.useObjectsGetListQuery()

    const { data: categoriesListData, isLoading: categoriesListLoading } = API.useCategoriesGetListQuery()

    const { data: equipmentListData, isLoading: equipmentListLoading } = API.useEquipmentsGetListQuery()

    const photoSchema = useMemo(() => {
        const framesMessage = t(
            'components.pages.photos.astro-photo-form.frames-required',
            'Введите количество кадров (целое число больше нуля)'
        )
        const exposureMessage = t(
            'components.pages.photos.astro-photo-form.exposure-required',
            'Введите выдержку в минутах (число больше нуля)'
        )

        const filterItemSchema = z.object({
            filter: z.enum(FILTER_KEYS as [ApiModel.FilterTypes, ...ApiModel.FilterTypes[]]),
            frames: z.number({ error: framesMessage }).int(framesMessage).positive(framesMessage),
            exposure: z.number({ error: exposureMessage }).positive(exposureMessage)
        })

        return z.object({
            categories: z
                .array(z.number())
                .min(
                    1,
                    t('components.pages.photos.astro-photo-form.categories-required', 'Выберите хотя бы одну категорию')
                ),
            objects: z
                .array(z.string())
                .min(1, t('components.pages.photos.astro-photo-form.objects-required', 'Выберите хотя бы один объект')),
            equipments: z
                .array(z.number())
                .min(
                    1,
                    t(
                        'components.pages.photos.astro-photo-form.equipments-required',
                        'Выберите хотя бы одно оборудование'
                    )
                ),
            date: z
                .string()
                .min(1, t('components.pages.photos.astro-photo-form.date-required', 'Укажите дату обработки')),
            filters: z
                .array(filterItemSchema)
                .min(1, t('components.pages.photos.astro-photo-form.filters-required', 'Добавьте хотя бы один фильтр')),
            upload: z.instanceof(File).optional()
        })
    }, [t])

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        setError,
        formState: { errors, isSubmitting }
    } = useForm<AstroPhotoFormValues>({
        resolver: zodResolver(photoSchema),
        // Not `mode: 'onChange'` + gating the button on `isValid`: with a
        // schema resolver, RHF only populates errors for fields the user has
        // already touched, so on a fresh "create" form the Save button would
        // sit silently disabled with zero visible explanation until every
        // field had been individually edited. Leaving RHF at its default
        // means the first submit attempt validates everything and shows
        // every error at once (see ReviewForm.tsx/ProfileCard.tsx).
        defaultValues: {
            categories: [],
            objects: [],
            equipments: [],
            date: '',
            filters: [],
            upload: undefined
        }
    })

    const { fields, append, remove } = useFieldArray({ control, name: 'filters' })

    const { fieldErrors } = useApiFormError(error)
    useSyncApiFieldErrors(fieldErrors, setError)
    useScrollToApiFieldErrors(fieldErrors)

    const addedFilterTypes = fields.map((field) => field.filter)
    const availableFilters = FILTER_KEYS.filter((filter) => !addedFilterTypes.includes(filter))

    const isFormDisabled = !!disabled || isSubmitting

    const handleAddFilter = () => {
        if (selectedFilter) {
            append({ filter: selectedFilter, frames: NaN, exposure: NaN })
            setSelectedFilter(undefined)
        }
    }

    // Server data arrives a tick after mount (it's fetched by the parent page),
    // so the `defaultValues` above only cover the "create" case - re-sync the
    // whole form once the real photo data shows up.
    useEffect(() => {
        if (initialData) {
            const initialFilterTypes = initialData.filters
                ? (Object.keys(initialData.filters) as ApiModel.FilterTypes[])
                : []

            reset({
                categories: initialData.categories ?? [],
                objects: initialData.objects ?? [],
                equipments: initialData.equipments ?? [],
                date: initialData.date ?? '',
                filters: initialFilterTypes.map((filter) => ({
                    filter,
                    frames: initialData.filters?.[filter]?.frames ?? NaN,
                    exposure: initialData.filters?.[filter]?.exposure
                        ? (initialData.filters[filter]?.exposure as number) / 60
                        : NaN
                })),
                upload: undefined
            })
        }
    }, [initialData, reset])

    const onValidSubmit = (values: AstroPhotoFormValues) => {
        const filters = values.filters.reduce<ApiModel.Filters>((acc, item) => {
            acc[item.filter] = { frames: item.frames, exposure: item.exposure }
            return acc
        }, {})

        onSubmit?.({
            ...initialData,
            categories: values.categories,
            objects: values.objects,
            equipments: values.equipments,
            date: values.date,
            filters,
            upload: values.upload
        })
    }

    // Fires when a submit attempt fails client-side (zod) validation - with
    // no mutation ever called, this is the only signal the user gets, so it
    // has to do more than the inline field message on its own can (see
    // `scrollToFirstFieldError`).
    const onInvalidSubmit = (formErrors: FieldErrors<AstroPhotoFormValues>) => {
        scrollToFirstFieldError(flattenFieldErrorPaths(formErrors))
    }

    return (
        <Container>
            <form
                onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
                noValidate={true}
            >
                <Controller
                    name={'categories'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Select<number>
                            data-testid={'categories'}
                            multiple={true}
                            required={true}
                            closeOnSelect={true}
                            disabled={isFormDisabled}
                            className={styles.formElement}
                            label={'Категория'}
                            notFoundCaption={'Ничего не найдено'}
                            placeholder={'Выберите одну или несколько категорий'}
                            loading={categoriesListLoading}
                            value={field.value}
                            error={fieldState.error?.message}
                            options={categoriesListData?.items?.map((item) => ({
                                key: item.id,
                                value: item.title
                            }))}
                            onSelect={(values) => field.onChange(values?.map(({ key }) => key) ?? [])}
                        />
                    )}
                />

                <Controller
                    name={'objects'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Select<string>
                            data-testid={'objects'}
                            multiple={true}
                            required={true}
                            closeOnSelect={true}
                            disabled={isFormDisabled}
                            className={styles.formElement}
                            label={'Объекты на фотографии'}
                            notFoundCaption={'Ничего не найдено'}
                            placeholder={'Выберите объекты, которые есть на фотографии'}
                            loading={objectsListLoading}
                            value={field.value}
                            error={fieldState.error?.message}
                            options={objectsListData?.items?.map((item) => ({
                                key: item.name,
                                value: formatObjectName(item.name)
                            }))}
                            onSelect={(values) => field.onChange(values?.map(({ key }) => key) ?? [])}
                        />
                    )}
                />

                <Controller
                    name={'equipments'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Select<number>
                            data-testid={'equipments'}
                            multiple={true}
                            required={true}
                            disabled={isFormDisabled}
                            className={styles.formElement}
                            label={'Оборудование'}
                            notFoundCaption={'Ничего не найдено'}
                            placeholder={'Выберите астрономическое оборудование'}
                            loading={equipmentListLoading}
                            value={field.value}
                            error={fieldState.error?.message}
                            options={equipmentListData?.items?.map((item) => ({
                                key: item.id,
                                value: [item.brand, item.model].filter(Boolean).join(' ')
                            }))}
                            onSelect={(values) => field.onChange(values?.map(({ key }) => key) ?? [])}
                        />
                    )}
                />

                <EquipmentPresets
                    onSelect={(equipments) =>
                        setValue('equipments', equipments, { shouldValidate: true, shouldDirty: true })
                    }
                />

                <Controller
                    name={'date'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <DateTimeInput
                            mode={'date'}
                            required={true}
                            disabled={isFormDisabled}
                            className={styles.formElement}
                            testId={'date'}
                            label={'Дата обработки'}
                            value={field.value}
                            error={fieldState.error?.message}
                            onChange={field.onChange}
                        />
                    )}
                />

                <div className={styles.addFilter}>
                    <Select<ApiModel.FilterTypes>
                        data-testid={'filters'}
                        label={'Параметры съемки'}
                        placeholder={'Добавить фильтр'}
                        value={selectedFilter}
                        disabled={isFormDisabled}
                        className={styles.filtersDropdown}
                        error={errors.filters?.message}
                        onSelect={(value) => setSelectedFilter(value?.[0]?.key)}
                        options={availableFilters?.map((filter) => ({
                            key: filter,
                            value: filter
                        }))}
                    />

                    <Button
                        type={'button'}
                        icon={'PlusCircle'}
                        size={'medium'}
                        aria-label={'Добавить фильтр'}
                        disabled={!selectedFilter || isFormDisabled}
                        onClick={handleAddFilter}
                    />
                </div>

                <div className={styles.filterList}>
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className={styles.filterItem}
                            style={{ backgroundColor: getFilterColor(field.filter) }}
                        >
                            <label>{field.filter}</label>

                            <Controller
                                name={`filters.${index}.frames`}
                                control={control}
                                render={({ field: framesField, fieldState }) => (
                                    <Input
                                        {...framesField}
                                        disabled={isFormDisabled}
                                        type={'number'}
                                        placeholder={'Количество кадров'}
                                        value={Number.isNaN(framesField.value) ? '' : framesField.value}
                                        error={fieldState.error?.message}
                                        onChange={(e) => framesField.onChange(parseFloat(e.target.value))}
                                    />
                                )}
                            />

                            <Controller
                                name={`filters.${index}.exposure`}
                                control={control}
                                render={({ field: exposureField, fieldState }) => (
                                    <Input
                                        {...exposureField}
                                        disabled={isFormDisabled}
                                        type={'number'}
                                        placeholder={'Выдержка (минут)'}
                                        value={Number.isNaN(exposureField.value) ? '' : exposureField.value}
                                        error={fieldState.error?.message}
                                        onChange={(e) => exposureField.onChange(parseFloat(e.target.value))}
                                    />
                                )}
                            />

                            <Button
                                type={'button'}
                                icon={'Close'}
                                mode={'outline'}
                                aria-label={`Удалить фильтр ${field.filter}`}
                                disabled={isFormDisabled}
                                onClick={() => remove(index)}
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

                <Controller
                    name={'upload'}
                    control={control}
                    render={({ field: { value: _value, onChange, ...restField } }) => (
                        // Native file inputs can't be value-controlled (setting `value` on
                        // one to anything but '' throws), so `value` is intentionally
                        // dropped from the spread and the input stays uncontrolled.
                        <div style={{ marginTop: 15 }}>
                            <label
                                htmlFor={'astroPhotoUpload'}
                                className={styles.formLabel}
                            >
                                {initialData?.fileName ? 'Заменить фотографию:' : 'Загрузить фотографию:'}
                            </label>
                            <input
                                {...restField}
                                id={'astroPhotoUpload'}
                                onChange={(e) => onChange(e.target.files?.[0])}
                                type={'file'}
                                disabled={isFormDisabled}
                                accept={'image/png, image/gif, image/jpeg'}
                            />
                        </div>
                    )}
                />

                <div className={styles.footer}>
                    <Button
                        type={'button'}
                        mode={'secondary'}
                        label={'Отмена'}
                        disabled={isFormDisabled}
                        onClick={onCancel}
                    />

                    <Button
                        type={'submit'}
                        mode={'primary'}
                        variant={'positive'}
                        label={'Сохранить'}
                        loading={isSubmitting}
                        disabled={isFormDisabled}
                    />
                </div>
            </form>
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
                type={'button'}
                label={preset.name}
                mode={'link'}
                onClick={() => onSelect(preset.equipments)}
            />
        ))}
    </div>
)
