import { API, ApiModel } from '@/api'
import React, { useEffect, useState } from 'react'
import { Button, Container, Input, MultiSelect } from 'simple-react-ui-kit'

import StarMap from '@/components/star-map'

import styles from './styles.module.sass'

export type AstroObjectFormType = Partial<
    Omit<ApiModel.Object, 'updated' | 'statistic' | 'filters'>
> & {
    image?: string
}

interface AstroObjectFormProps {
    disabled?: boolean
    initialData?: AstroObjectFormType
    onSubmit?: (formData?: AstroObjectFormType) => void
    onCancel?: () => void
}

// TODO: При window resize нужно перестраивать карту под новое разрешение
const AstroObjectForm: React.FC<AstroObjectFormProps> = ({
    disabled,
    initialData,
    onSubmit,
    onCancel
}) => {
    // const dispatch = useAppDispatch()
    // const application = useAppSelector((state) => state.application)
    // const value = application.editableItemCatalog

    const [formData, setFormData] = useState<AstroObjectFormType>({})

    const { data: categoriesListData, isLoading: categoriesListLoading } =
        API.useCategoriesGetListQuery()

    // const { data: categoriesData } = API.useCategoryGetListQuery()
    // const { data: catalogData, isFetching } = API.useCatalogGetItemQuery(
    //     value?.name || '',
    //     {
    //         skip: !value?.name
    //     }
    // )
    //
    // const [
    //     updateItem,
    //     {
    //         isLoading: updateLoading,
    //         isSuccess: updateSuccess,
    //         isError: updateError,
    //         error: updateErrorList
    //     }
    // ] = API.useCatalogPatchMutation()
    //
    // const [
    //     createItem,
    //     {
    //         isLoading: createLoading,
    //         isSuccess: createSuccess,
    //         isError: createError,
    //         error: createErrorList
    //     }
    // ] = API.useCatalogPostMutation()
    //
    // const [submitted, setSubmitted] = useState<boolean>(false)
    // const [formState, setFormState] = useState<ApiType.Catalog.ReqSet>(
    //     mapFormProps(value)
    // )
    //
    // const handleChange = ({
    //     target: { name, value }
    // }: React.ChangeEvent<HTMLInputElement>) =>
    //     setFormState((prev) => ({ ...prev, [name]: value }))
    //
    // const handleKeyDown = (e: { key: string; target: HTMLInputElement }) => {
    //     if (e.target.tagName !== 'TEXTAREA' && e.key === 'Enter') {
    //         handleSubmit()
    //     }
    // }
    //
    // const findError = (field: keyof ApiType.Catalog.ReqSet) =>
    //     (
    //         (createErrorList as ApiType.ResError) ||
    //         (updateErrorList as ApiType.ResError)
    //     )?.messages?.[field] || undefined
    //
    // const handleClose = () => {
    //     setFormState(mapFormProps(undefined))
    //     setSubmitted(false)
    //     dispatch(openFormCatalog(false))
    // }
    //
    // const isFormDirty = useMemo(
    //     () => isEqual(mapFormProps(catalogData), formState),
    //     [catalogData, formState]
    // )
    //
    // const handleSubmit = useCallback(() => {
    //     const canvasImage = document
    //         ?.getElementById('celestial-map')
    //         ?.getElementsByTagName('canvas')?.[0]
    //         ?.toDataURL()
    //
    //     setSubmitted(true)
    //
    //     if (!value?.name) {
    //         createItem({ ...formState, image: canvasImage })
    //     } else {
    //         updateItem({ ...formState, image: canvasImage })
    //     }
    // }, [formState, createItem, updateItem, value?.name])
    //
    // useEffect(() => {
    //     setFormState(mapFormProps(catalogData))
    // }, [catalogData])

    const handleSubmit = () => {
        const canvasImage = document
            ?.getElementById('celestial-map')
            ?.getElementsByTagName('canvas')?.[0]
            ?.toDataURL()

        onSubmit?.({ ...formData, image: canvasImage })
    }

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        }
    }, [initialData])

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
                value={formData?.categories}
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

            <div className={styles.sections}>
                <div className={styles.inputSection}>
                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        label={'Имя объекта в каталогах'}
                        value={formData?.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                    />

                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        label={'Название объекта'}
                        value={formData?.title}
                        onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                        }
                    />

                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        label={'Ссылка на FITS файлы'}
                        value={formData?.fitsCloudLink}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                fitsCloudLink: e.target.value
                            })
                        }
                    />

                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        label={'RA'}
                        type={'number'}
                        value={formData?.ra}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                ra: parseFloat(e.target.value)
                            })
                        }
                    />

                    <Input
                        required={true}
                        disabled={disabled}
                        className={styles.formElement}
                        label={'DEC'}
                        type={'number'}
                        value={formData?.dec}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                dec: parseFloat(e.target.value)
                            })
                        }
                    />
                </div>
                <StarMap
                    // className={styles.mapSection}
                    zoom={14}
                    objects={
                        formData?.ra && formData?.dec
                            ? [
                                  {
                                      ra: formData.ra,
                                      dec: formData.dec,
                                      name: formData?.name ?? 'Unknown'
                                  }
                              ]
                            : undefined
                    }
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

        // <Form
        //     onSubmit={handleSubmit}
        //     loading={createLoading || updateLoading || isFetching}
        //     success={(createSuccess || updateSuccess) && submitted}
        //     error={(createError || updateError) && submitted}
        //     size={'small'}
        // >
        //     <Message
        //         error
        //         header={'Ошибка сохранения'}
        //         content={
        //             'При сохранении объекта были допущены ошибки, проверьте правильность заполнения полей'
        //         }
        //     />
        //     <Message
        //         success
        //         header={'Объект сохранен'}
        //         content={'Все данные объекта успешно сохранены'}
        //     />
        //     <Form.Input
        //         fluid
        //         name={'title'}
        //         label={'Название'}
        //         onChange={handleChange}
        //         onKeyDown={handleKeyDown}
        //         defaultValue={value?.title}
        //         error={findError('title')}
        //     />
        //     <Form.Dropdown
        //         placeholder={'Выберите категорию'}
        //         fluid
        //         search
        //         selection
        //         value={formState?.category}
        //         error={findError('category')}
        //         onChange={(e, data) =>
        //             setFormState({
        //                 ...formState,
        //                 category: data.value as number
        //             })
        //         }
        //         onKeyDown={handleKeyDown}
        //         // options={categoriesData?.items?.map(({ id, name }) => ({
        //         //     text: name,
        //         //     value: id
        //         // }))}
        //     />
        //     <Form.TextArea
        //         onChange={(event, data) =>
        //             setFormState((prev) => ({
        //                 ...prev,
        //                 text: data.value?.toString()!
        //             }))
        //         }
        //         label={'Описание'}
        //         onKeyDown={handleKeyDown}
        //         defaultValue={formState?.text}
        //         error={findError('text')}
        //         rows={7}
        //     />
        //     <Form.Input
        //         fluid
        //         name={'source_link'}
        //         label={'Ссылка на исходные данные (FITS)'}
        //         onChange={handleChange}
        //         onKeyDown={handleKeyDown}
        //         defaultValue={formState?.source_link}
        //         error={findError('source_link')}
        //     />
        //     <Grid>
        //         <Grid.Column width={6}>
        //             <Form.Input
        //                 required
        //                 name={'name'}
        //                 label={'Идентификатор'}
        //                 onChange={handleChange}
        //                 onKeyDown={handleKeyDown}
        //                 defaultValue={formState?.name}
        //                 disabled={!!value?.name}
        //                 error={findError('name')}
        //             />
        //             <Form.Input
        //                 required
        //                 name={'coord_ra'}
        //                 label={'RA'}
        //                 onChange={handleChange}
        //                 onKeyDown={handleKeyDown}
        //                 value={formState?.coord_ra || 0}
        //                 error={findError('coord_ra')}
        //             />
        //             <Form.Input
        //                 required
        //                 name={'coord_dec'}
        //                 label={'DEC'}
        //                 onChange={handleChange}
        //                 onKeyDown={handleKeyDown}
        //                 value={formState?.coord_dec || 0}
        //                 error={findError('coord_dec')}
        //             />
        //         </Grid.Column>
        //         <Grid.Column
        //             width={10}
        //             className={styles.celestialMap}
        //         >
        //             <CelestialMap
        //                 objects={[
        //                     {
        //                         dec: formState?.coord_dec!,
        //                         name: formState?.name || '',
        //                         ra: formState?.coord_ra!
        //                     }
        //                 ]}
        //             />
        //         </Grid.Column>
        //     </Grid>
        // </Form>
    )
}

export default AstroObjectForm
