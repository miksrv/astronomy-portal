import React, { useEffect, useMemo, useState } from 'react'
import { Controller, FieldErrors, useForm, useWatch } from 'react-hook-form'
import { Button, Container, Input, Message, Select, Skeleton } from 'simple-react-ui-kit'
import { zodResolver } from '@hookform/resolvers/zod'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType } from '@/api'
import { MarkdownEditor, SimbadPanel, StarMap } from '@/components/common'
import useApiFormError from '@/hooks/useApiFormError'
import useScrollToApiFieldErrors from '@/hooks/useScrollToApiFieldErrors'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import { coordinateToText, formatDECShort, formatRAShort, parseDec, parseRA } from '@/utils/coordinates'
import { flattenFieldErrorPaths, scrollToFirstFieldError } from '@/utils/formErrorScroll'

import { buildObjectSchema } from './schema'

import styles from './styles.module.sass'

export type AstroObjectFormType = Partial<Omit<ApiModel.Object, 'updated' | 'statistic' | 'filters'>> & {
    image?: string
    simbad?: ApiType.Objects.SimbadFacts | null
}

interface AstroObjectFormProps {
    disabled?: boolean
    /** The object being edited; none - a new one is created */
    initialData?: AstroObjectFormType
    /** RTK Query error from the create/patch mutation — shown inline next to the field it belongs to. */
    error?: unknown
    onSubmit?: (formData?: AstroObjectFormType) => void
    onCancel?: () => void
    /** The form differs from what was loaded (or, for a new object, from empty) */
    onDirtyChange?: (dirty: boolean) => void
}

interface AstroObjectFormValues {
    categories: number[]
    name: string
    title: string
    fitsCloudLink: string
    /** As typed: degrees or hours (see utils.ts), turned into degrees on submit */
    ra: string
    dec: string
    // Numeric inputs are kept as plain `number` (never `undefined`) so the form
    // stays fully-typed - an empty field is represented as `NaN` (what
    // `parseFloat('')` already produces), which zod's `z.number()` rejects as
    // an invalid type just like a missing value would be.
    /** Light years; NaN when not known */
    distance: number
    /** Apparent visual magnitude; NaN when not known */
    magnitude: number
    description: string
    /** Looked up with "Найти в SIMBAD" in this form; saved with the object */
    simbad: ApiType.Objects.SimbadFacts | null
}

/** The star map here: our own zoom buttons (as on /observatory), not Celestial's */
const MAP_CONFIG = { controls: false }

const EMPTY_VALUES: AstroObjectFormValues = {
    categories: [],
    name: '',
    title: '',
    fitsCloudLink: '',
    ra: '',
    dec: '',
    distance: NaN,
    magnitude: NaN,
    description: '',
    simbad: null
}

/**
 * Creating and editing an object, in four groups: what it is (names, categories, what SIMBAD
 * knows of it), where it is on the sky (coordinates in degrees or hours, checked on the star
 * map), its facts and its description with the FITS archive.
 */
export const AstroObjectForm: React.FC<AstroObjectFormProps> = ({
    disabled,
    initialData,
    error,
    onSubmit,
    onCancel,
    onDirtyChange
}) => {
    const { t, i18n } = useTranslation()

    const isEdit = !!initialData?.name

    const { data: categoriesListData, isLoading: categoriesListLoading } = API.useCategoriesGetListQuery()

    const objectSchema = useMemo(() => buildObjectSchema(t), [t])

    const {
        control,
        handleSubmit,
        reset,
        setError,
        setValue,
        getValues,
        formState: { isSubmitting, isDirty }
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
        defaultValues: EMPTY_VALUES
    })

    const { message, fieldErrors } = useApiFormError(error)
    useSyncApiFieldErrors(fieldErrors, setError)
    useScrollToApiFieldErrors(fieldErrors)

    // An error with no field to show it on (the server, the network) goes above the actions
    const formError = message && !Object.keys(fieldErrors).length ? message : undefined

    const raText = useWatch({ control, name: 'ra' })
    const decText = useWatch({ control, name: 'dec' })
    const nameValue = useWatch({ control, name: 'name' })

    const ra = parseRA(raText)
    const dec = parseDec(decText)
    const hasPosition = ra !== undefined && dec !== undefined && ra >= 0 && ra < 360 && Math.abs(dec) <= 90

    useEffect(() => {
        onDirtyChange?.(isDirty)
    }, [isDirty, onDirtyChange])

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
                ra: coordinateToText(initialData.ra),
                dec: coordinateToText(initialData.dec),
                distance: initialData.distance ?? NaN,
                magnitude: initialData.magnitude ?? NaN,
                description: initialData.description ?? '',
                simbad: null
            })
        }
    }, [initialData, reset])

    const isFormDisabled = !!disabled || isSubmitting

    const onValidSubmit = (values: AstroObjectFormValues) => {
        // Snapshot the star map canvas as it looks right now, at save time, so
        // the object gets a thumbnail matching the coordinates just entered -
        // must stay inside the submit handler rather than run eagerly.
        const canvasImage = document?.getElementById('celestial-map')?.getElementsByTagName('canvas')?.[0]?.toDataURL()

        onSubmit?.({
            ...values,
            ra: parseRA(values.ra),
            dec: parseDec(values.dec),
            distance: Number.isNaN(values.distance) ? null : values.distance,
            magnitude: Number.isNaN(values.magnitude) ? null : values.magnitude,
            simbad: values.simbad,
            image: canvasImage
        })
    }

    // Fires when a submit attempt fails client-side (zod) validation - with
    // no mutation ever called, this is the only signal the user gets, so it
    // has to do more than the inline field message on its own can (see
    // `scrollToFirstFieldError`).
    const onInvalidSubmit = (formErrors: FieldErrors<AstroObjectFormValues>) => {
        scrollToFirstFieldError(flattenFieldErrorPaths(formErrors))
    }

    // "Найти в SIMBAD": the answer fills the empty fields; the rest is the editor's to decide
    const [lookupSimbad, { isFetching: simbadLoading, error: simbadError }] = API.useLazyObjectsSimbadLookupQuery()
    const [filled, setFilled] = useState<string[]>([])
    const [lookedUpName, setLookedUpName] = useState<string>()
    const simbadValue = useWatch({ control, name: 'simbad' })

    // The facts belong to the name they were found for: another name drops them, so they are
    // never saved against a different object
    useEffect(() => {
        if (simbadValue && lookedUpName !== undefined && nameValue.trim() !== lookedUpName) {
            setValue('simbad', null)
            setFilled([])
            setLookedUpName(undefined)
        }
    }, [nameValue, simbadValue, lookedUpName, setValue])

    const handleSimbadLookup = async () => {
        const name = getValues('name').trim()

        if (!name) {
            setError('name', {
                message: t(
                    'components.pages.objects.astro-object-form.simbad-name-first',
                    'Сначала введите имя объекта'
                )
            })

            return
        }

        const result = await lookupSimbad(name, true)

        if (!result.data) {
            return
        }

        const facts = result.data
        const changes: string[] = []
        const dirty = { shouldDirty: true, shouldValidate: false }

        setValue('simbad', facts, dirty)
        setLookedUpName(name)

        if (parseRA(getValues('ra')) === undefined && parseDec(getValues('dec')) === undefined) {
            setValue('ra', coordinateToText(facts.ra), dirty)
            setValue('dec', coordinateToText(facts.dec), dirty)
            changes.push(t('components.pages.objects.astro-object-form.filled-coordinates', 'координаты'))
        }

        if (Number.isNaN(getValues('magnitude')) && typeof facts.magnitude === 'number') {
            setValue('magnitude', facts.magnitude, dirty)
            changes.push(t('components.pages.objects.astro-object-form.filled-magnitude', 'звёздная величина'))
        }

        setFilled(changes)
    }

    const handleUseSimbadCoordinates = () => {
        if (simbadValue) {
            setValue('ra', coordinateToText(simbadValue.ra), { shouldDirty: true, shouldValidate: true })
            setValue('dec', coordinateToText(simbadValue.dec), { shouldDirty: true, shouldValidate: true })
        }
    }

    // Shown under the name: the lookup just made, or what is stored with the edited object
    const storedSimbad: ApiType.Objects.SimbadFacts | null = initialData?.simbadId
        ? {
              simbadId: initialData.simbadId,
              ra: initialData.ra ?? 0,
              dec: initialData.dec ?? 0,
              type: initialData.type ?? null,
              majAxis: initialData.majAxis ?? null,
              minAxis: initialData.minAxis ?? null,
              magnitude: null,
              aliases: initialData.aliases ?? []
          }
        : null

    const viewControls = useMemo(
        () => ({
            zoomIn: t('components.pages.objects.astro-object-form.map-zoom-in', 'Приблизить'),
            zoomOut: t('components.pages.objects.astro-object-form.map-zoom-out', 'Отдалить')
        }),
        [t]
    )

    const numberField = (value: number) => (Number.isNaN(value) ? '' : value)

    return (
        <Container>
            <form
                className={styles.form}
                onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
                noValidate={true}
            >
                <fieldset
                    className={styles.group}
                    disabled={isFormDisabled}
                >
                    <legend className={styles.legend}>
                        {t('components.pages.objects.astro-object-form.group-object', 'Объект')}
                    </legend>

                    <div className={styles.grid}>
                        <Controller
                            name={'name'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <div className={styles.field}>
                                    <div className={styles.nameRow}>
                                        <Input
                                            {...field}
                                            size={'medium'}
                                            required={true}
                                            // The object's key: its frames and photos are linked by it.
                                            // The value stays in the form (Controller), so it is still sent
                                            disabled={isFormDisabled || isEdit}
                                            autoComplete={'off'}
                                            spellCheck={false}
                                            className={styles.formElement}
                                            label={t(
                                                'components.pages.objects.astro-object-form.catalog-name',
                                                'Имя объекта в каталогах'
                                            )}
                                            error={fieldState.error?.message}
                                        />
                                        <Button
                                            type={'button'}
                                            mode={'secondary'}
                                            icon={'Search'}
                                            className={styles.simbadButton}
                                            loading={simbadLoading}
                                            disabled={isFormDisabled || simbadLoading}
                                            label={
                                                isEdit && (storedSimbad || simbadValue)
                                                    ? t(
                                                          'components.pages.objects.astro-object-form.simbad-refresh',
                                                          'Обновить из SIMBAD'
                                                      )
                                                    : t('components.common.simbad-panel.lookup', 'Найти в SIMBAD')
                                            }
                                            onClick={handleSimbadLookup}
                                        />
                                    </div>
                                    {!fieldState.error && (
                                        <p className={styles.hint}>
                                            {isEdit
                                                ? t(
                                                      'components.pages.objects.astro-object-form.name-hint-edit',
                                                      'По имени связаны кадры и снимки, оно не меняется'
                                                  )
                                                : t(
                                                      'components.pages.objects.astro-object-form.name-hint',
                                                      'Как в FITS-кадрах и архиве observatory-api: M_51, NGC_7000, Sh2_155'
                                                  )}
                                        </p>
                                    )}
                                </div>
                            )}
                        />

                        <Controller
                            name={'title'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <div className={styles.field}>
                                    <Input
                                        {...field}
                                        size={'medium'}
                                        required={true}
                                        disabled={isFormDisabled}
                                        className={styles.formElement}
                                        label={t(
                                            'components.pages.objects.astro-object-form.title',
                                            'Название объекта'
                                        )}
                                        error={fieldState.error?.message}
                                    />
                                    {!fieldState.error && (
                                        <p className={styles.hint}>
                                            {t(
                                                'components.pages.objects.astro-object-form.title-hint',
                                                'Как объект называют люди; это заголовок его страницы'
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        />

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
                                    className={`${styles.formElement} ${styles.fullRow}`}
                                    label={t('components.pages.objects.astro-object-form.category', 'Категория')}
                                    notFoundCaption={t(
                                        'components.pages.objects.astro-object-form.not-found',
                                        'Ничего не найдено'
                                    )}
                                    placeholder={t(
                                        'components.pages.objects.astro-object-form.categories-placeholder',
                                        'Выберите одну или несколько категорий'
                                    )}
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

                        <div className={styles.fullRow}>
                            <SimbadPanel
                                facts={simbadValue ?? storedSimbad}
                                fresh={!!simbadValue}
                                filled={filled}
                                ra={ra}
                                dec={dec}
                                loading={simbadLoading}
                                error={simbadError}
                                emptyText={
                                    isEdit
                                        ? t(
                                              'components.pages.objects.astro-object-form.simbad-none',
                                              'Объект ещё не сверялся с SIMBAD. Нажмите «Найти в SIMBAD» — подставим тип, угловой размер и другие обозначения.'
                                          )
                                        : t(
                                              'components.pages.objects.astro-object-form.simbad-create',
                                              'Нажмите «Найти в SIMBAD» — подставим координаты, тип, угловой размер и звёздную величину. Если не нажимать, данные подтянутся из SIMBAD при сохранении.'
                                          )
                                }
                                note={
                                    simbadValue
                                        ? t(
                                              'components.pages.objects.astro-object-form.simbad-fresh',
                                              'Тип, размер и обозначения сохранятся вместе с формой.'
                                          )
                                        : t(
                                              'components.pages.objects.astro-object-form.simbad-stored',
                                              'Данные SIMBAD, сохранённые у объекта.'
                                          )
                                }
                                onUseCoordinates={handleUseSimbadCoordinates}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset
                    className={styles.group}
                    disabled={isFormDisabled}
                >
                    <legend className={styles.legend}>
                        {t('components.pages.objects.astro-object-form.group-position', 'Положение на небе')}
                    </legend>

                    <div className={styles.position}>
                        <div className={styles.grid}>
                            <Controller
                                name={'ra'}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <div className={styles.field}>
                                        <Input
                                            {...field}
                                            size={'medium'}
                                            required={true}
                                            disabled={isFormDisabled}
                                            autoComplete={'off'}
                                            className={styles.formElement}
                                            label={t(
                                                'components.pages.objects.astro-object-form.ra',
                                                'Прямое восхождение (RA)'
                                            )}
                                            error={fieldState.error?.message}
                                        />
                                        {!fieldState.error && (
                                            <p className={styles.hint}>
                                                {ra !== undefined && ra >= 0 && ra < 360
                                                    ? `= ${formatRAShort(ra)} · ${Number(ra.toFixed(4)).toLocaleString(i18n.language)}°`
                                                    : t(
                                                          'components.pages.objects.astro-object-form.ra-hint',
                                                          'В градусах или часах атласа: 202.47, 13:29:53, 13h 29m 53s'
                                                      )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            />

                            <Controller
                                name={'dec'}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <div className={styles.field}>
                                        <Input
                                            {...field}
                                            size={'medium'}
                                            required={true}
                                            disabled={isFormDisabled}
                                            autoComplete={'off'}
                                            className={styles.formElement}
                                            label={t(
                                                'components.pages.objects.astro-object-form.dec',
                                                'Склонение (Dec)'
                                            )}
                                            error={fieldState.error?.message}
                                        />
                                        {!fieldState.error && (
                                            <p className={styles.hint}>
                                                {dec !== undefined && Math.abs(dec) <= 90
                                                    ? `= ${formatDECShort(dec)} · ${Number(dec.toFixed(4)).toLocaleString(i18n.language)}°`
                                                    : t(
                                                          'components.pages.objects.astro-object-form.dec-hint',
                                                          'В градусах: 47.195, −5.39 или +47:11:43'
                                                      )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            />
                        </div>

                        <div className={styles.map}>
                            <StarMap
                                className={styles.mapCanvas}
                                zoom={7}
                                config={MAP_CONFIG}
                                viewControls={viewControls}
                                objects={
                                    hasPosition
                                        ? [
                                              {
                                                  ra: ra as number,
                                                  dec: dec as number,
                                                  name: nameValue || 'Unknown'
                                              }
                                          ]
                                        : undefined
                                }
                            />
                            {!hasPosition && (
                                <p className={styles.mapEmpty}>
                                    {t(
                                        'components.pages.objects.astro-object-form.map-empty',
                                        'Введите координаты — объект появится на карте'
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </fieldset>

                <fieldset
                    className={styles.group}
                    disabled={isFormDisabled}
                >
                    <legend className={styles.legend}>
                        {t('components.pages.objects.astro-object-form.group-facts', 'Характеристики')}
                        <span className={styles.optional}>
                            {t('components.pages.objects.astro-object-form.optional', 'необязательно')}
                        </span>
                    </legend>

                    <div className={styles.grid}>
                        <Controller
                            name={'distance'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <div className={styles.field}>
                                    <Input
                                        {...field}
                                        size={'medium'}
                                        disabled={isFormDisabled}
                                        className={styles.formElement}
                                        label={t(
                                            'components.pages.objects.astro-object-form.distance',
                                            'Расстояние, св. лет'
                                        )}
                                        type={'number'}
                                        min={0}
                                        inputMode={'decimal'}
                                        value={numberField(field.value)}
                                        error={fieldState.error?.message}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                    {!fieldState.error && (
                                        <p className={styles.hint}>
                                            {t(
                                                'components.pages.objects.astro-object-form.distance-hint',
                                                'Заполняется вручную. Если оставить пустым, расстояние не покажется на странице объекта'
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        />

                        <Controller
                            name={'magnitude'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <div className={styles.field}>
                                    <Input
                                        {...field}
                                        size={'medium'}
                                        disabled={isFormDisabled}
                                        className={styles.formElement}
                                        label={t(
                                            'components.pages.objects.astro-object-form.magnitude',
                                            'Звёздная величина'
                                        )}
                                        type={'number'}
                                        step={0.1}
                                        inputMode={'decimal'}
                                        value={numberField(field.value)}
                                        error={fieldState.error?.message}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                    {!fieldState.error && (
                                        <p className={styles.hint}>
                                            {isEdit
                                                ? t(
                                                      'components.pages.objects.astro-object-form.magnitude-hint',
                                                      'Видимая, в полосе V. Ваше значение главнее: SIMBAD заполняет только пустое поле'
                                                  )
                                                : t(
                                                      'components.pages.objects.astro-object-form.magnitude-hint-create',
                                                      'Видимая, в полосе V. Пусто — подставим из SIMBAD; своё значение можно ввести всегда'
                                                  )}
                                        </p>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                </fieldset>

                <fieldset
                    className={styles.group}
                    disabled={isFormDisabled}
                >
                    <legend className={styles.legend}>
                        {t('components.pages.objects.astro-object-form.group-about', 'Описание и архив')}
                    </legend>

                    <div className={styles.stack}>
                        <Controller
                            name={'description'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <MarkdownEditor
                                    name={field.name}
                                    value={field.value}
                                    disabled={isFormDisabled}
                                    label={t(
                                        'components.pages.objects.astro-object-form.description',
                                        'Описание объекта'
                                    )}
                                    hint={t(
                                        'components.pages.objects.astro-object-form.description-hint',
                                        'Раздел «Об объекте» на его странице. «Просмотр» показывает текст так, как его увидят посетители'
                                    )}
                                    error={fieldState.error?.message}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />

                        <Controller
                            name={'fitsCloudLink'}
                            control={control}
                            render={({ field, fieldState }) => (
                                <div className={styles.field}>
                                    <Input
                                        {...field}
                                        size={'medium'}
                                        type={'url'}
                                        inputMode={'url'}
                                        disabled={isFormDisabled}
                                        className={styles.formElement}
                                        label={t(
                                            'components.pages.objects.astro-object-form.fits-link',
                                            'Ссылка на FITS файлы'
                                        )}
                                        error={fieldState.error?.message}
                                    />
                                    {!fieldState.error && (
                                        <p className={styles.hint}>
                                            {t(
                                                'components.pages.objects.astro-object-form.fits-link-hint',
                                                'Папка в облаке с кадрами объекта — для кнопки «Скачать FITS-архив»'
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                </fieldset>

                {formError && <Message type={'error'}>{formError}</Message>}

                <div className={styles.footer}>
                    <Button
                        type={'button'}
                        mode={'outline'}
                        label={t('common.cancel', 'Отмена')}
                        disabled={isSubmitting}
                        onClick={onCancel}
                    />

                    <Button
                        type={'submit'}
                        mode={'primary'}
                        label={
                            isEdit
                                ? t('components.pages.objects.astro-object-form.save', 'Сохранить изменения')
                                : t('components.pages.objects.astro-object-form.create', 'Добавить объект')
                        }
                        loading={isSubmitting || (!!disabled && isDirty)}
                        disabled={isFormDisabled}
                    />
                </div>
            </form>
        </Container>
    )
}

/** The form's place while the edited object loads */
export const AstroObjectFormSkeleton: React.FC = () => <Skeleton className={styles.formSkeleton} />
