import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, Container, Input, Message, Progress, Select } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, ApiType } from '@/api'
import { SimbadPanel, StarMap, useUnsavedChangesGuard, VisibilityChart } from '@/components/common'
import { FilterTag, FilterTagList } from '@/components/common/filter-tag'
import useApiFormError from '@/hooks/useApiFormError'
import { useSnackbar } from '@/hooks/useSnackbar'
import { getObjectTypeLabel } from '@/utils/catalog'
import { formatDECShort, formatRAShort, parseDec, parseRA } from '@/utils/coordinates'
import { FILTER_LABELS } from '@/utils/filters'

import { CUSTOM, DEFAULT_ROW, MAP_CONFIG, SIMBAD_OPTION } from './constants'
import { JobCover } from './JobCover'
import { useObjectCovers } from './useObjectCovers'
import { formatDate, formatDuration, isShownField, observatoryToday, toNumber, totalSeconds } from './utils'

import styles from './styles.module.sass'

interface JobFormProps {
    config: ApiType.Telescope.ResConfig
    /** Sent: the new job (the page goes on to it) */
    onCreated: (job: ApiModel.TelescopeJob) => void
    /** Where "Cancel" leads (asked first when something was filled in) */
    cancelHref: string
}

/** The target as the form knows it once chosen */
interface Target {
    name: string
    ra: number
    dec: number
    /** Our catalog object, when picked from it */
    object: string | null
    /** What SIMBAD knows, when looked up there */
    simbad?: ApiType.Objects.SimbadFacts
    magnitude?: number | null
}

type PlanChoice = string

interface StepProps {
    number: number
    title: string
    hint?: string
    id: string
    children: React.ReactNode
}

/** One numbered part of the form */
const Step: React.FC<StepProps> = ({ number, title, hint, id, children }) => (
    <fieldset
        className={styles.step}
        aria-describedby={hint ? `${id}-hint` : undefined}
    >
        <legend className={styles.stepLegend}>
            <span
                className={styles.stepNumber}
                aria-hidden={true}
            >
                {number}
            </span>
            {title}
        </legend>
        {hint && (
            <p
                id={`${id}-hint`}
                className={styles.stepHint}
            >
                {hint}
            </p>
        )}
        {children}
    </fieldset>
)

/**
 * "New job" in three steps: the object (our catalog or SIMBAD in one search, or coordinates by
 * hand) with its visibility tonight and its place on the sky; the frames (a preset or one's own
 * plan, with the exposure against the limit); the conditions, folded until wanted. A summary bar
 * says what will be sent, or why it can't be yet. The server checks everything again; its errors
 * land on their fields.
 */
export const JobForm: React.FC<JobFormProps> = ({ config, onCreated, cancelHref }) => {
    const { t, i18n } = useTranslation()
    const snackbar = useSnackbar()
    const covers = useObjectCovers()

    const [target, setTarget] = useState<Target>()
    const [search, setSearch] = useState('')
    const lastSearch = useRef('')
    const [manual, setManual] = useState(false)
    const [manualName, setManualName] = useState('')
    const [raText, setRaText] = useState('')
    const [decText, setDecText] = useState('')

    const presetKeys = Object.keys(config.presets)
    const [choice, setChoice] = useState<PlanChoice>(presetKeys.includes('LRGB') ? 'LRGB' : (presetKeys[0] ?? CUSTOM))
    const [rows, setRows] = useState<ApiModel.TelescopePlanRow[]>([DEFAULT_ROW])

    const [conditionsOpen, setConditionsOpen] = useState(false)
    const [minAltitude, setMinAltitude] = useState(String(config.defaultMinAltitude))
    const [moonSeparation, setMoonSeparation] = useState('')
    const [validUntil, setValidUntil] = useState('')

    const [created, setCreated] = useState<ApiModel.TelescopeJob>()
    const [triedSubmit, setTriedSubmit] = useState(false)
    const stepOneRef = useRef<HTMLDivElement>(null)

    const { data: objects, isLoading: objectsLoading } = API.useObjectsGetListQuery()
    const [lookupSimbad, { isFetching: simbadLoading, error: simbadError }] = API.useLazyObjectsSimbadLookupQuery()
    const [createJob, { isLoading: saving, error: saveError }] = API.useTelescopeCreateJobMutation()
    const { message: formError, fieldErrors } = useApiFormError(saveError)

    // The target: chosen, or typed by hand
    // Out of the sky's range is as unreadable as a typo (the API refuses it too)
    const parsedRa = parseRA(raText)
    const parsedDec = parseDec(decText)
    const manualRa = parsedRa !== undefined && parsedRa >= 0 && parsedRa < 360 ? parsedRa : undefined
    const manualDec = parsedDec !== undefined && parsedDec >= -90 && parsedDec <= 90 ? parsedDec : undefined
    const current: Target | undefined = manual
        ? manualName.trim() && manualRa !== undefined && manualDec !== undefined
            ? { dec: manualDec, name: manualName.trim(), object: null, ra: manualRa }
            : undefined
        : target

    // The same array while the target is the same: a new one redraws the whole star map
    const mapObjects = useMemo(
        () => (current ? [{ dec: current.dec, name: current.name, ra: current.ra }] : []),
        [current?.dec, current?.name, current?.ra]
    )

    const plan = choice === CUSTOM ? rows : (config.presets[choice] ?? [])
    const total = totalSeconds(plan)
    const limited = !config.unlimited
    const overLimit = limited && total > config.maxExposureSeconds
    const quotaLeft = limited ? config.maxActiveJobs - (config.activeJobs ?? 0) : undefined
    const quotaFull = quotaLeft !== undefined && quotaLeft <= 0
    const dirty = !!(target || manualName || raText || decText || choice === CUSTOM)

    const guard = useUnsavedChangesGuard(dirty && !saving && !created)

    // After the guard has let go (its effect runs first): on to the new job
    useEffect(() => {
        if (created) {
            onCreated(created)
        }
    }, [created])

    const objectOptions = useMemo(() => {
        const catalog = (objects?.items ?? [])
            .filter((item) => typeof item.ra === 'number' && typeof item.dec === 'number')
            .map((item) => {
                const name = item.name.replace(/_/g, ' ')

                return { key: item.name, value: item.title && item.title !== name ? `${item.title} (${name})` : name }
            })
        const typed = search.trim()

        return typed.length >= 2
            ? [
                  ...catalog,
                  {
                      key: SIMBAD_OPTION,
                      value: t(
                          'components.pages.observatory.telescope-jobs.form-search-simbad',
                          'Найти «{{name}}» в SIMBAD',
                          {
                              // As typed, spaces at the ends too: the select keeps an option only
                              // while its text contains the search
                              name: search
                          }
                      )
                  }
              ]
            : catalog
    }, [objects, search, t])

    const handlePick = async (key?: string) => {
        if (key === SIMBAD_OPTION) {
            const name = lastSearch.current.trim()
            const result = await lookupSimbad(name, true)

            if (result.data) {
                setTarget({
                    dec: result.data.dec,
                    magnitude: result.data.magnitude,
                    name,
                    object: null,
                    ra: result.data.ra,
                    simbad: result.data
                })
            }

            return
        }

        const item = objects?.items.find((candidate) => candidate.name === key)

        if (item && typeof item.ra === 'number' && typeof item.dec === 'number') {
            setTarget({
                dec: item.dec,
                magnitude: item.magnitude,
                name: item.title || item.name.replace(/_/g, ' '),
                object: item.name,
                ra: item.ra
            })
        }
    }

    const updateRow = (index: number, change: Partial<ApiModel.TelescopePlanRow>) =>
        setRows((list) => list.map((row, i) => (i === index ? { ...row, ...change } : row)))

    const unusedFilters = config.filters.filter((filter) => !rows.some((row) => row.filter === filter))

    // A custom row the server would reject (it checks the same ranges)
    const badRow =
        choice === CUSTOM &&
        rows.some(
            (row) =>
                !Number.isInteger(row.exposure) ||
                !Number.isInteger(row.count) ||
                row.exposure < (limited ? config.exposureMin : 1) ||
                row.count < 1 ||
                (limited && (row.exposure > config.exposureMax || row.count > config.maxFramesPerFilter))
        )

    // Why it can't be sent yet, said in the summary bar
    const blocker = !current
        ? manual
            ? t('components.pages.observatory.telescope-jobs.form-need-manual', 'Укажите название и координаты цели')
            : t('components.pages.observatory.telescope-jobs.form-need-target', 'Выберите объект')
        : !plan.length
          ? t('components.pages.observatory.telescope-jobs.form-need-plan', 'Добавьте хотя бы один фильтр')
          : badRow
            ? t('components.pages.observatory.telescope-jobs.form-bad-row', 'Проверьте выдержку и число кадров')
            : overLimit
              ? t('components.pages.observatory.telescope-jobs.form-over-limit', 'Выдержка больше лимита')
              : quotaFull
                ? t('components.pages.observatory.telescope-jobs.form-quota-full', 'Лимит активных заданий исчерпан')
                : undefined

    const conditionsSummary = [
        t('components.pages.observatory.telescope-jobs.form-cond-altitude', 'выше {{altitude}}°', {
            altitude: toNumber(minAltitude) ?? config.defaultMinAltitude
        }),
        toNumber(moonSeparation)
            ? t('components.pages.observatory.telescope-jobs.form-cond-moon', 'от Луны ≥ {{degrees}}°', {
                  degrees: toNumber(moonSeparation)
              })
            : t('components.pages.observatory.telescope-jobs.form-cond-moon-any', 'Луна не мешает'),
        validUntil
            ? t('components.pages.observatory.telescope-jobs.form-cond-until', 'до {{date}}', {
                  date: formatDate(validUntil, i18n.language)
              })
            : t('components.pages.observatory.telescope-jobs.form-cond-no-date', 'без срока')
    ].join(' · ')

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setTriedSubmit(true)

        if (!current) {
            stepOneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

            return
        }

        if (blocker) {
            return
        }

        try {
            const result = await createJob({
                dec: current.dec,
                minAltitude: toNumber(minAltitude),
                minMoonSeparation: toNumber(moonSeparation),
                mode: choice === CUSTOM ? 'pro' : 'simple',
                object: current.object,
                ra: current.ra,
                targetName: current.name,
                validUntil: validUntil || null,
                ...(choice === CUSTOM ? { plan: rows } : { preset: choice })
            }).unwrap()

            snackbar.push(result.message, { type: 'success' })
            setCreated(result.job)
        } catch (error) {
            // An error on a folded condition: unfold them so it is seen
            const fields = (error as ApiType.ResError)?.errors ?? {}

            if (fields.minAltitude || fields.minMoonSeparation || fields.validUntil) {
                setConditionsOpen(true)
            }
        }
    }

    const presetDescription = (key: string): string =>
        ({
            HOO: t('components.pages.observatory.telescope-jobs.preset-hoo', 'Эмиссионные туманности: Hα и OIII'),
            L: t('components.pages.observatory.telescope-jobs.preset-l', 'Детали и яркость, чёрно-белое изображение'),
            LRGB: t(
                'components.pages.observatory.telescope-jobs.preset-lrgb',
                'Цветное изображение: галактики и скопления'
            ),
            RGB: t('components.pages.observatory.telescope-jobs.preset-rgb', 'Цвет без яркостного канала'),
            SHO: t('components.pages.observatory.telescope-jobs.preset-sho', 'Палитра «Хаббла»: SII, Hα и OIII')
        })[key] ?? ''

    const targetFacts = current
        ? [
              current.simbad ? getObjectTypeLabel(current.simbad.type, t) : undefined,
              typeof current.magnitude === 'number' ? `${current.magnitude}ᵐ` : undefined,
              `${formatRAShort(current.ra)} ${formatDECShort(current.dec)}`
          ].filter(Boolean)
        : []

    const needTarget = t('components.pages.observatory.telescope-jobs.form-need-target', 'Выберите объект')
    const unreadable = t('components.pages.observatory.telescope-jobs.form-unreadable', 'Не получилось прочитать')
    // A coordinate typed by hand: unreadable as soon as it is, missing once "Send" was pressed
    const coordinateError = (text: string, value: number | undefined): string | undefined =>
        value !== undefined
            ? undefined
            : text.trim()
              ? unreadable
              : triedSubmit
                ? t('components.pages.observatory.telescope-jobs.form-need-coordinate', 'Укажите координату')
                : undefined

    return (
        // The page's h1 names it: the card has no title of its own
        <Container className={styles.form}>
            <form
                onSubmit={handleSubmit}
                noValidate={true}
            >
                {/* Said before the form is filled in, not only beside "Send" at its end */}
                {quotaFull && (
                    <Message type={'warning'}>
                        {t(
                            'components.pages.observatory.telescope-jobs.form-quota-full',
                            'Лимит активных заданий исчерпан'
                        )}
                    </Message>
                )}

                <div ref={stepOneRef}>
                    <Step
                        id={'job-target'}
                        number={1}
                        title={t('components.pages.observatory.telescope-jobs.form-step-target', 'Объект')}
                    >
                        {!manual && !target && (
                            <div className={styles.field}>
                                <Select<string>
                                    searchable={true}
                                    loading={objectsLoading || simbadLoading}
                                    label={t(
                                        'components.pages.observatory.telescope-jobs.form-search',
                                        'Найдите объект'
                                    )}
                                    placeholder={t(
                                        'components.pages.observatory.telescope-jobs.form-search-placeholder',
                                        'M 31, туманность Ориона, NGC 7000…'
                                    )}
                                    notFoundCaption={t(
                                        'components.pages.observatory.telescope-jobs.form-search-empty',
                                        'Введите хотя бы два символа названия'
                                    )}
                                    error={triedSubmit ? needTarget : undefined}
                                    options={objectOptions}
                                    onSearch={(text) => {
                                        if (text) {
                                            lastSearch.current = text
                                        }

                                        setSearch(text ?? '')
                                    }}
                                    onSelect={(selected) => void handlePick(selected?.[0]?.key)}
                                />
                                <p className={styles.hint}>
                                    {t(
                                        'components.pages.observatory.telescope-jobs.form-search-hint',
                                        'Ищем в нашем каталоге; если объекта там нет — в SIMBAD по названию.'
                                    )}{' '}
                                    <Button
                                        type={'button'}
                                        mode={'link'}
                                        label={t(
                                            'components.pages.observatory.telescope-jobs.form-manual',
                                            'Ввести координаты вручную'
                                        )}
                                        onClick={() => setManual(true)}
                                    />
                                </p>
                                {simbadError && (
                                    <SimbadPanel
                                        error={simbadError}
                                        facts={null}
                                    />
                                )}
                            </div>
                        )}

                        {manual && (
                            <div className={styles.manual}>
                                <Input
                                    required={true}
                                    label={t('components.pages.observatory.telescope-jobs.form-name', 'Название цели')}
                                    value={manualName}
                                    maxLength={60}
                                    autoComplete={'off'}
                                    error={
                                        fieldErrors.targetName ??
                                        (triedSubmit && !manualName.trim()
                                            ? t(
                                                  'components.pages.observatory.telescope-jobs.form-need-name',
                                                  'Как назвать цель?'
                                              )
                                            : undefined)
                                    }
                                    onChange={(event) => setManualName(event.target.value)}
                                />
                                <div className={styles.grid}>
                                    <div className={styles.field}>
                                        <Input
                                            required={true}
                                            label={t(
                                                'components.pages.observatory.telescope-jobs.form-ra',
                                                'Прямое восхождение (J2000)'
                                            )}
                                            value={raText}
                                            autoComplete={'off'}
                                            inputMode={'decimal'}
                                            error={fieldErrors.ra ?? coordinateError(raText, manualRa)}
                                            onChange={(event) => setRaText(event.target.value)}
                                        />
                                        <p className={styles.hint}>
                                            {t(
                                                'components.pages.observatory.telescope-jobs.form-ra-hint',
                                                'Градусы или часы: 202.47 или 13:29:53'
                                            )}
                                        </p>
                                    </div>
                                    <div className={styles.field}>
                                        <Input
                                            required={true}
                                            label={t(
                                                'components.pages.observatory.telescope-jobs.form-dec',
                                                'Склонение (J2000)'
                                            )}
                                            value={decText}
                                            autoComplete={'off'}
                                            inputMode={'decimal'}
                                            error={fieldErrors.dec ?? coordinateError(decText, manualDec)}
                                            onChange={(event) => setDecText(event.target.value)}
                                        />
                                        <p className={styles.hint}>
                                            {t(
                                                'components.pages.observatory.telescope-jobs.form-dec-hint',
                                                'Градусы: 47.195 или +47:11:43'
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <Button
                                        type={'button'}
                                        mode={'link'}
                                        label={t(
                                            'components.pages.observatory.telescope-jobs.form-back-to-search',
                                            '← Искать по названию'
                                        )}
                                        onClick={() => setManual(false)}
                                    />
                                </div>
                            </div>
                        )}

                        {!manual && target && (
                            <div className={styles.targetCard}>
                                <JobCover
                                    src={target.object ? covers[target.object] : undefined}
                                    plan={plan}
                                    size={'small'}
                                />
                                <div className={styles.targetInfo}>
                                    <Input
                                        label={t(
                                            'components.pages.observatory.telescope-jobs.form-name',
                                            'Название цели'
                                        )}
                                        value={target.name}
                                        maxLength={60}
                                        error={fieldErrors.targetName}
                                        onChange={(event) => setTarget({ ...target, name: event.target.value })}
                                    />
                                    <p className={styles.meta}>{targetFacts.join(' · ')}</p>
                                </div>
                                <Button
                                    type={'button'}
                                    mode={'secondary'}
                                    size={'small'}
                                    label={t(
                                        'components.pages.observatory.telescope-jobs.form-change-target',
                                        'Другой объект'
                                    )}
                                    onClick={() => {
                                        setTarget(undefined)
                                        setSearch('')
                                    }}
                                />
                            </div>
                        )}

                        {!manual && target?.simbad && (
                            <SimbadPanel
                                facts={target.simbad}
                                fresh={true}
                            />
                        )}

                        {current && (
                            <div className={styles.preview}>
                                <VisibilityChart
                                    ra={current.ra}
                                    dec={current.dec}
                                    name={current.name}
                                />
                                <div className={styles.previewMap}>
                                    <StarMap
                                        className={styles.mapCanvas}
                                        fitContainer={true}
                                        interactive={false}
                                        zoom={5}
                                        config={MAP_CONFIG}
                                        objects={mapObjects}
                                    />
                                </div>
                            </div>
                        )}
                    </Step>
                </div>

                <Step
                    id={'job-plan'}
                    number={2}
                    title={t('components.pages.observatory.telescope-jobs.form-step-plan', 'Кадры')}
                    hint={t(
                        'components.pages.observatory.telescope-jobs.form-step-plan-hint',
                        'Камеру, усиление и биннинг настраивает обсерватория; вы выбираете фильтры, выдержку и число кадров.'
                    )}
                >
                    <div
                        className={styles.presets}
                        role={'radiogroup'}
                        aria-label={t('components.pages.observatory.telescope-jobs.form-preset', 'Набор')}
                    >
                        {[...presetKeys, CUSTOM].map((key) => {
                            const custom = key === CUSTOM
                            const rowsOf = custom ? rows : (config.presets[key] ?? [])

                            return (
                                <button
                                    key={key}
                                    type={'button'}
                                    role={'radio'}
                                    aria-checked={choice === key}
                                    className={cn(styles.preset, choice === key && styles.presetSelected)}
                                    onClick={() => setChoice(key)}
                                >
                                    <span className={styles.presetHead}>
                                        <span className={styles.presetName}>
                                            {custom
                                                ? t(
                                                      'components.pages.observatory.telescope-jobs.form-custom',
                                                      'Свой план'
                                                  )
                                                : key}
                                        </span>
                                        {!custom && (
                                            <span className={styles.muted}>
                                                {formatDuration(totalSeconds(rowsOf), t)}
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.presetText}>
                                        {custom
                                            ? t(
                                                  'components.pages.observatory.telescope-jobs.form-custom-text',
                                                  'Свои фильтры, выдержки и число кадров'
                                              )
                                            : presetDescription(key)}
                                    </span>
                                    {!custom && (
                                        <FilterTagList>
                                            {rowsOf.map((row) => (
                                                <FilterTag
                                                    key={row.filter}
                                                    filter={row.filter}
                                                >
                                                    {`× ${row.count}`}
                                                </FilterTag>
                                            ))}
                                        </FilterTagList>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {choice === CUSTOM && (
                        <div className={styles.planEditor}>
                            {rows.map((row, index) => (
                                <div
                                    key={`${row.filter}-${index}`}
                                    className={styles.planEditorRow}
                                >
                                    <Select<ApiModel.FilterTypes>
                                        label={t('components.pages.observatory.telescope-jobs.form-filter', 'Фильтр')}
                                        options={[row.filter, ...unusedFilters].map((filter) => ({
                                            key: filter,
                                            value: FILTER_LABELS[filter]
                                        }))}
                                        value={row.filter}
                                        error={fieldErrors[`plan.${index}.filter`]}
                                        onSelect={(selected) =>
                                            selected?.[0] && updateRow(index, { filter: selected[0].key })
                                        }
                                    />
                                    <Input
                                        type={'number'}
                                        inputMode={'numeric'}
                                        label={t(
                                            'components.pages.observatory.telescope-jobs.form-exposure',
                                            'Выдержка, с'
                                        )}
                                        value={String(row.exposure)}
                                        min={limited ? config.exposureMin : 1}
                                        max={limited ? config.exposureMax : undefined}
                                        error={fieldErrors[`plan.${index}.exposure`]}
                                        onChange={(event) => updateRow(index, { exposure: Number(event.target.value) })}
                                    />
                                    <Input
                                        type={'number'}
                                        inputMode={'numeric'}
                                        label={t('components.pages.observatory.telescope-jobs.form-count', 'Кадров')}
                                        value={String(row.count)}
                                        min={1}
                                        max={limited ? config.maxFramesPerFilter : undefined}
                                        error={fieldErrors[`plan.${index}.count`]}
                                        onChange={(event) => updateRow(index, { count: Number(event.target.value) })}
                                    />
                                    <span className={styles.rowTotal}>
                                        {formatDuration(row.exposure * row.count, t)}
                                    </span>
                                    <Button
                                        type={'button'}
                                        mode={'secondary'}
                                        icon={'Close'}
                                        aria-label={t(
                                            'components.pages.observatory.telescope-jobs.form-remove-row',
                                            'Убрать строку'
                                        )}
                                        disabled={rows.length === 1}
                                        onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
                                    />
                                </div>
                            ))}
                            <div className={styles.planEditorFooter}>
                                {!!unusedFilters.length && (
                                    <Button
                                        type={'button'}
                                        mode={'secondary'}
                                        size={'small'}
                                        icon={'PlusCircle'}
                                        label={t(
                                            'components.pages.observatory.telescope-jobs.form-add-row',
                                            'Добавить фильтр'
                                        )}
                                        onClick={() =>
                                            setRows((list) => [
                                                ...list,
                                                { ...DEFAULT_ROW, filter: unusedFilters[0] ?? DEFAULT_ROW.filter }
                                            ])
                                        }
                                    />
                                )}
                                {limited && (
                                    <span className={styles.caption}>
                                        {t(
                                            'components.pages.observatory.telescope-jobs.form-limits',
                                            'Выдержка {{min}}–{{max}} с, до {{frames}} кадров на фильтр',
                                            {
                                                frames: config.maxFramesPerFilter,
                                                max: config.exposureMax,
                                                min: config.exposureMin
                                            }
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {(fieldErrors.plan || fieldErrors.preset || fieldErrors.mode) && (
                        <p className={styles.error}>{fieldErrors.plan ?? fieldErrors.preset ?? fieldErrors.mode}</p>
                    )}

                    <div className={styles.exposureMeter}>
                        <div className={styles.exposureText}>
                            <span>
                                {t('components.pages.observatory.telescope-jobs.form-exposure-total', 'Общая выдержка')}
                            </span>
                            <strong className={overLimit ? styles.over : undefined}>
                                {limited
                                    ? t(
                                          'components.pages.observatory.telescope-jobs.form-total',
                                          '{{total}} из {{limit}}',
                                          {
                                              limit: formatDuration(config.maxExposureSeconds, t),
                                              total: formatDuration(total, t)
                                          }
                                      )
                                    : formatDuration(total, t)}
                            </strong>
                        </div>
                        {limited && (
                            <Progress
                                value={Math.min(100, Math.round((total / config.maxExposureSeconds) * 100))}
                                height={6}
                                color={overLimit ? 'red' : 'main'}
                            />
                        )}
                    </div>
                </Step>

                <Step
                    id={'job-conditions'}
                    number={3}
                    title={t('components.pages.observatory.telescope-jobs.form-step-conditions', 'Условия')}
                >
                    {!conditionsOpen ? (
                        <div className={styles.conditionsSummary}>
                            <span>{conditionsSummary}</span>
                            <Button
                                type={'button'}
                                mode={'link'}
                                label={t('components.pages.observatory.telescope-jobs.form-change', 'Изменить')}
                                onClick={() => setConditionsOpen(true)}
                            />
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <Input
                                    type={'number'}
                                    inputMode={'numeric'}
                                    label={t(
                                        'components.pages.observatory.telescope-jobs.form-min-altitude',
                                        'Минимальная высота, °'
                                    )}
                                    value={minAltitude}
                                    min={config.altitudeFloor}
                                    max={80}
                                    error={fieldErrors.minAltitude}
                                    onChange={(event) => setMinAltitude(event.target.value)}
                                />
                                {!fieldErrors.minAltitude && (
                                    <p className={styles.hint}>
                                        {t(
                                            'components.pages.observatory.telescope-jobs.form-min-altitude-hint',
                                            'От {{floor}}° до 80°. Чем выше, тем меньше атмосферы и чётче кадр.',
                                            { floor: config.altitudeFloor }
                                        )}
                                    </p>
                                )}
                            </div>
                            <div className={styles.field}>
                                <Input
                                    type={'number'}
                                    inputMode={'numeric'}
                                    label={t(
                                        'components.pages.observatory.telescope-jobs.form-moon',
                                        'Не ближе к Луне, °'
                                    )}
                                    value={moonSeparation}
                                    min={0}
                                    max={180}
                                    error={fieldErrors.minMoonSeparation}
                                    onChange={(event) => setMoonSeparation(event.target.value)}
                                />
                                {!fieldErrors.minMoonSeparation && (
                                    <p className={styles.hint}>
                                        {t(
                                            'components.pages.observatory.telescope-jobs.form-moon-hint',
                                            'Необязательно. Для L/R/G/B пригодится 40–60°, узкополосным Луна почти не мешает.'
                                        )}
                                    </p>
                                )}
                            </div>
                            <div className={styles.field}>
                                <Input
                                    type={'date'}
                                    label={t(
                                        'components.pages.observatory.telescope-jobs.form-valid-until',
                                        'Снять до'
                                    )}
                                    value={validUntil}
                                    min={observatoryToday()}
                                    error={fieldErrors.validUntil}
                                    onChange={(event) => setValidUntil(event.target.value)}
                                />
                                {!fieldErrors.validUntil && (
                                    <p className={styles.hint}>
                                        {t(
                                            'components.pages.observatory.telescope-jobs.form-valid-until-hint',
                                            'Необязательно: без даты задание ждёт ясной ночи сколько нужно.'
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Step>

                {formError && !Object.keys(fieldErrors).some(isShownField) && (
                    <Message type={'error'}>{formError}</Message>
                )}

                <div className={styles.summaryBar}>
                    <div className={styles.summaryText}>
                        {current && (
                            <strong>
                                {[
                                    current.name,
                                    choice === CUSTOM
                                        ? t('components.pages.observatory.telescope-jobs.form-custom', 'Свой план')
                                        : choice,
                                    formatDuration(total, t)
                                ].join(' · ')}
                            </strong>
                        )}
                        <span className={blocker ? styles.summaryBlocker : styles.muted}>
                            {blocker ??
                                (limited
                                    ? t(
                                          'components.pages.observatory.telescope-jobs.form-review-note',
                                          'Задание сначала проверит администратор'
                                      )
                                    : t(
                                          'components.pages.observatory.telescope-jobs.form-approved-note',
                                          'Ваше задание будет одобрено сразу'
                                      ))}
                        </span>
                    </div>
                    <div className={styles.formActions}>
                        <Button
                            type={'button'}
                            mode={'outline'}
                            label={t('common.cancel', 'Отмена')}
                            disabled={saving}
                            onClick={() => guard.navigate(cancelHref)}
                        />
                        <Button
                            type={'submit'}
                            mode={'primary'}
                            loading={saving}
                            disabled={saving || (!!blocker && !!current)}
                            label={t('components.pages.observatory.telescope-jobs.form-submit', 'Отправить задание')}
                        />
                    </div>
                </div>
            </form>

            {guard.dialog}
        </Container>
    )
}
