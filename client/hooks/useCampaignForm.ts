import { ChangeEvent, useEffect, useState } from 'react'

import { useRouter } from 'next/router'

/**
 * Shared state machine behind the admin campaign forms - `pages/admin/mailing/form.tsx`
 * and `pages/admin/push-notifications/form.tsx` - which are the same draft/audience/
 * upload/test-send/launch flow against two near-identical (but not interchangeable)
 * RTK Query endpoint families. Extracted after the two pages drifted out of sync during
 * copy-paste maintenance: the mailing page kept redirecting after a *failed* launch
 * mutation while the push-notifications page was fixed to stay put and surface the
 * error. Centralizing the flow here means that class of bug can only be fixed (or
 * reintroduced) once, for both pages at the same time.
 *
 * Each RTK Query hook is injected rather than imported directly so this stays a plain
 * function, not tied to a specific `API.use*` slice - callers pass their own generated
 * hooks in `config`. Passing a stable hook reference (e.g. `API.useMailingCreateMutation`)
 * as a parameter and calling it unconditionally inside this hook is safe under the
 * Rules of Hooks: the same function reference is supplied on every render, so the call
 * order never changes.
 *
 * Field state that differs per campaign type (mailing: subject/content; push:
 * title/body/url) intentionally stays in the page component - only the parts that were
 * byte-for-byte identical between the two pages live here.
 */

export type CampaignAudienceType = 'all' | 'event'

export interface CampaignAudienceFields {
    audienceType?: CampaignAudienceType
    audienceEventId?: string | null
}

export interface CampaignAudienceItem {
    type: CampaignAudienceType
    eventId: string | null
    labelRu: string
    labelEn: string
    count: number
}

export interface CampaignItemBase {
    id: string
    status: string
    audienceType?: CampaignAudienceType
    audienceEventId?: string | null
}

type MutationResult<TData> = { data?: TData } | { error?: unknown }
type MutationState = { isLoading: boolean; isSuccess?: boolean; error?: unknown }

export interface UseCampaignFormConfig<
    TItem extends CampaignItemBase,
    TCreateReq extends CampaignAudienceFields,
    TUpdateReq extends CampaignAudienceFields,
    TUploadRes
> {
    /** Id from the route query - undefined when creating a new campaign. */
    id?: string
    /** Where to send the admin back to after a successful launch. */
    redirectPath: string

    useGetItemQuery: (id: string, options: { skip: boolean }) => { data?: TItem; isLoading: boolean }
    useGetAudiencesQuery: () => { data?: { items: CampaignAudienceItem[] }; isLoading: boolean }
    useCreateMutation: () => readonly [(args: TCreateReq) => Promise<MutationResult<TItem>>, MutationState]
    useUpdateMutation: () => readonly [
        (args: TUpdateReq & { id: string }) => Promise<MutationResult<TItem>>,
        MutationState
    ]
    useUploadMutation: () => readonly [
        (args: { id: string; formData: FormData }) => Promise<MutationResult<TUploadRes>>,
        MutationState
    ]
    useTestSendMutation: () => readonly [(id: string) => Promise<MutationResult<unknown>>, MutationState]
    useLaunchMutation: () => readonly [(id: string) => Promise<MutationResult<unknown>>, MutationState]

    /** Populate the page-owned field state (subject/content, title/body/url, …) once the item loads. */
    onItemLoaded: (item: TItem) => void
    /** FormData field name the upload endpoint expects - differs per backend contract ('upload' vs 'image'). */
    uploadFieldName: string
    getMediaUrl: (item: TItem) => string | undefined
    getUploadedUrl: (data: TUploadRes) => string
    buildCreatePayload: (audience: CampaignAudienceFields) => TCreateReq
    buildUpdatePayload: (audience: CampaignAudienceFields) => TUpdateReq
}

const parseAudienceValue = (value: string): CampaignAudienceFields =>
    value.startsWith('event_')
        ? { audienceEventId: value.slice('event_'.length), audienceType: 'event' }
        : { audienceEventId: null, audienceType: 'all' }

export const useCampaignForm = <
    TItem extends CampaignItemBase,
    TCreateReq extends CampaignAudienceFields,
    TUpdateReq extends CampaignAudienceFields,
    TUploadRes
>(
    config: UseCampaignFormConfig<TItem, TCreateReq, TUpdateReq, TUploadRes>
) => {
    const router = useRouter()
    const { id, redirectPath } = config

    const { data: itemData, isLoading: itemLoading } = config.useGetItemQuery(id!, { skip: !id })
    const { data: audiencesData, isLoading: audiencesLoading } = config.useGetAudiencesQuery()

    const [createItem, { isLoading: createLoading, isSuccess: createSuccess, error: createError }] =
        config.useCreateMutation()
    const [updateItem, { isLoading: updateLoading, isSuccess: updateSuccess, error: updateError }] =
        config.useUpdateMutation()
    const [uploadMedia, { isLoading: uploadLoading }] = config.useUploadMutation()
    const [testSend, { isLoading: testLoading, isSuccess: testSuccess, error: testError }] =
        config.useTestSendMutation()
    const [launchItem, { isLoading: launchLoading, error: launchError }] = config.useLaunchMutation()

    const [audienceValue, setAudienceValue] = useState<string>('all')
    const [mediaUrl, setMediaUrl] = useState<string | undefined>()
    const [showConfirm, setShowConfirm] = useState(false)
    const [savedId, setSavedId] = useState<string | undefined>(id)

    useEffect(() => {
        if (itemData) {
            config.onItemLoaded(itemData)
            setMediaUrl(config.getMediaUrl(itemData))

            if (itemData.audienceType === 'event' && itemData.audienceEventId) {
                setAudienceValue(`event_${itemData.audienceEventId}`)
            } else {
                setAudienceValue('all')
            }
        }
    }, [itemData])

    const currentId = savedId ?? id

    const handleSaveDraft = async () => {
        const audience = parseAudienceValue(audienceValue)

        if (currentId) {
            await updateItem({ ...config.buildUpdatePayload(audience), id: currentId })
        } else {
            const result = await createItem(config.buildCreatePayload(audience))

            if ('data' in result && result.data) {
                setSavedId(result.data.id)
            }
        }
    }

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (!file || !currentId) {
            return
        }

        const formData = new FormData()
        formData.append(config.uploadFieldName, file)

        const result = await uploadMedia({ formData, id: currentId })

        if ('data' in result && result.data) {
            setMediaUrl(config.getUploadedUrl(result.data))
        }
    }

    const handleTestSend = async () => {
        if (!currentId) {
            return
        }

        await testSend(currentId)
    }

    const handleLaunchConfirm = async () => {
        if (!currentId) {
            return
        }

        setShowConfirm(false)

        const result = await launchItem(currentId)

        if ('error' in result) {
            // Stay on the page instead of redirecting - a failed launch must never look
            // like it succeeded. `launchError` below is what the page renders instead.
            return
        }

        await router.push(redirectPath)
    }

    const isDraft = !itemData || itemData.status === 'draft'
    const isBusy = itemLoading || createLoading || updateLoading || launchLoading
    const saveError = createError ?? updateError

    return {
        itemData,
        itemLoading,
        audiencesData,
        audiencesLoading,

        audienceValue,
        setAudienceValue,
        mediaUrl,
        showConfirm,
        setShowConfirm,
        currentId,

        isDraft,
        isBusy,

        createLoading,
        updateLoading,
        createSuccess,
        updateSuccess,
        saveError,

        uploadLoading,

        testLoading,
        testSuccess,
        testError,

        launchLoading,
        launchError,

        handleSaveDraft,
        handleFileChange,
        handleTestSend,
        handleLaunchConfirm
    }
}

export default useCampaignForm
