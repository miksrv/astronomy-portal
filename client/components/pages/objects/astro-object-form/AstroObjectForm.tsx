import React, { useEffect, useMemo } from 'react'
import { Controller, FieldErrors, useForm, useWatch } from 'react-hook-form'
import { Button, Container, Input, Select, TextArea } from 'simple-react-ui-kit'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { StarMap } from '@/components/common'
import useApiFormError from '@/hooks/useApiFormError'
import useScrollToApiFieldErrors from '@/hooks/useScrollToApiFieldErrors'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import { flattenFieldErrorPaths, scrollToFirstFieldError } from '@/utils/formErrorScroll'

import styles from './styles.module.sass'

export type AstroObjectFormType = Partial<Omit<ApiModel.Object, 'updated' | 'statistic' | 'filters'>> & {
    image?: string
}

interface AstroObjectFormProps {
    disabled?: boolean
    initialData?: AstroObjectFormType
    /** RTK Query error from the create/patch mutation — shown inline next to the field it belongs to. */
    error?: unknown
    onSubmit?: (formData?: AstroObjectFormType) => void
    onCancel?: () => void
}

// RA/DEC are stored in degrees (see `utils/coordinates.ts`), so RA is validated
// against a full 0-360 turn and DEC against the -90..90 range of a sphere.
const RA_MIN = 0
const RA_MAX = 360
const DEC_MIN = -90
const DEC_MAX = 90

interface AstroObjectFormValues {
    categories: number[]
    name: string
    title: string
    fitsCloudLink: string
    // Numeric inputs are kept as plain `number` (never `undefined`) so the form
    // stays fully-typed - an empty field is represented as `NaN` (what
    // `parseFloat('')` already produces), which zod's `z.number()` rejects as
    // an invalid type just like a missing value would be.
    ra: number
    dec: number
    description: string
}

// TODO: При window resize нужно перестраивать карту под новое разрешение
export const AstroObjectForm: React.FC<AstroObjectFormProps> = ({
    disabled,
    initialData,
    error,
    onSubmit,
    onCancel
}) => {
    const { t } = useTranslation()

    const { data: categoriesListData, isLoading: categoriesListLoading } = API.useCategoriesGetListQuery()

    const objectSchema = useMemo(
        () =>
            z.object({
                categories: z
                    .array(z.number())
                    .min(
                        1,
                        t(
                            'components.pages.objects.astro-object-form.categories-required',
                            'Выберите хотя бы одну категорию'
                        )
                    ),
                name: z
                    .string()
                    .trim()
                    .min(
                        1,
                        t('components.pages.objects.astro-object-form.name-required', 'Введите имя объекта в каталогах')
                    ),
                title: z
                    .string()
                    .trim()
                    .min(1, t('components.pages.objects.astro-object-form.title-required', 'Введите название объекта')),
                fitsCloudLink: z.string().trim(),
                ra: z
                    .number({
                        error: t('components.pages.objects.astro-object-form.ra-required', 'Введите значение RA')
                    })
                    .min(
                        RA_MIN,
                        t(
                            'components.pages.objects.astro-object-form.ra-range',
                            'RA должно быть в диапазоне от 0 до 360'
                        )
                    )
                    .max(
                        RA_MAX,
                        t(
                            'components.pages.objects.astro-object-form.ra-range',
                            'RA должно быть в диапазоне от 0 до 360'
                        )
                    ),
                dec: z
                    .number({
                        error: t('components.pages.objects.astro-object-form.dec-required', 'Введите значение DEC')
                    })
                    .min(
                        DEC_MIN,
                        t(
                            'components.pages.objects.astro-object-form.dec-range',
                            'DEC должно быть в диапазоне от -90 до 90'
                        )
                    )
                    .max(
                        DEC_MAX,
                        t(
                            'components.pages.objects.astro-object-form.dec-range',
                            'DEC должно быть в диапазоне от -90 до 90'
                        )
                    ),
                description: z.string().trim()
            }),
        [t]
    )

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { isSubmitting }
    } = useForm<AstroObjectFormValues>({
        resolver: zodResolver(objectSchema),
        // Not `mode: 'onChange'` + gating the button on `isValid`: with a
        // schema resolver, RHF only populates `formState`/`fieldState` errors
        // for fields the user has already touched, so on a fresh "create"
        // form (every field still empty) the Save button would sit silently
        // disabled with zero visible explanation until every field had been
        // individually edited. Leaving RHF at its default means the first
        // submit attempt validates everything and shows every error at once
        // (see ReviewForm.tsx/ProfileCard.tsx for the same reasoning).
        defaultValues: {
            categories: [],
            name: '',
            title: '',
            fitsCloudLink: '',
            ra: NaN,
            dec: NaN,
            description: ''
        }
    })

    const { fieldErrors } = useApiFormError(error)
    useSyncApiFieldErrors(fieldErrors, setError)
    useScrollToApiFieldErrors(fieldErrors)

    const raValue = useWatch({ control, name: 'ra' })
    const decValue = useWatch({ control, name: 'dec' })
    const nameValue = useWatch({ control, name: 'name' })

    // Server data arrives a tick after mount (it's fetched by the parent page),
    // so the `defaultValues` above only cover the "create" case - re-sync the
    // whole form once the real object data shows up.
    useEffect(() => {
        if (initialData) {
            reset({
                categories: initialData.categories ?? [],
                name: initialData.name ?? '',
                title: initialData.title ?? '',
                fitsCloudLink: initialData.fitsCloudLink ?? '',
                ra: initialData.ra ?? NaN,
                dec: initialData.dec ?? NaN,
                description: initialData.description ?? ''
            })
        }
    }, [initialData, reset])

    const isFormDisabled = !!disabled || isSubmitting

    const onValidSubmit = (values: AstroObjectFormValues) => {
        // Snapshot the star map canvas as it looks right now, at save time, so
        // the object gets a thumbnail matching the coordinates just entered -
        // must stay inside the submit handler rather than run eagerly.
        const canvasImage = document?.getElementById('celestial-map')?.getElementsByTagName('canvas')?.[0]?.toDataURL()

        onSubmit?.({ ...values, image: canvasImage })
    }

    // Fires when a submit attempt fails client-side (zod) validation - with
    // no mutation ever called, this is the only signal the user gets, so it
    // has to do more than the inline field message on its own can (see
    // `scrollToFirstFieldError`).
    const onInvalidSubmit = (formErrors: FieldErrors<AstroObjectFormValues>) => {
        scrollToFirstFieldError(flattenFieldErrorPaths(formErrors))
    }

    return (
        <Container>
            <form
                onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
                noValidate={true}
            >
                <div className={styles.sections}>
                    <div className={styles.inputSection}>
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
                            name={'name'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Input
                                    {...field}
                                    size={'medium'}
                                    required={true}
                                    disabled={isFormDisabled}
                                    className={styles.formElement}
                                    label={'Имя объекта в каталогах'}
                                    error={fieldState.error?.message}
                                />
                            )}
                        />

                        <Controller
                            name={'title'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Input
                                    {...field}
                                    size={'medium'}
                                    required={true}
                                    disabled={isFormDisabled}
                                    className={styles.formElement}
                                    label={'Название объекта'}
                                    error={fieldState.error?.message}
                                />
                            )}
                        />

                        <Controller
                            name={'fitsCloudLink'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Input
                                    {...field}
                                    size={'medium'}
                                    disabled={isFormDisabled}
                                    className={styles.formElement}
                                    label={'Ссылка на FITS файлы'}
                                    error={fieldState.error?.message}
                                />
                            )}
                        />

                        <Controller
                            name={'ra'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Input
                                    {...field}
                                    size={'medium'}
                                    required={true}
                                    disabled={isFormDisabled}
                                    className={styles.formElement}
                                    label={'RA'}
                                    type={'number'}
                                    value={Number.isNaN(field.value) ? '' : field.value}
                                    error={fieldState.error?.message}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                            )}
                        />

                        <Controller
                            name={'dec'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Input
                                    {...field}
                                    size={'medium'}
                                    required={true}
                                    disabled={isFormDisabled}
                                    className={styles.formElement}
                                    label={'DEC'}
                                    type={'number'}
                                    value={Number.isNaN(field.value) ? '' : field.value}
                                    error={fieldState.error?.message}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                            )}
                        />
                    </div>
                    <StarMap
                        className={styles.mapSection}
                        zoom={7}
                        objects={
                            raValue && decValue
                                ? [
                                      {
                                          ra: raValue,
                                          dec: decValue,
                                          name: nameValue || 'Unknown'
                                      }
                                  ]
                                : undefined
                        }
                    />
                </div>

                <Controller
                    name={'description'}
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextArea
                            {...field}
                            disabled={isFormDisabled}
                            className={styles.formElement}
                            label={'Описание объекта'}
                            error={fieldState.error?.message}
                            autoResize={true}
                        />
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
