import { useEffect } from 'react'
import { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/**
 * Bridges backend field-level validation errors (as returned by
 * `useApiFormError`'s `fieldErrors`) into an `react-hook-form` instance, so
 * `formState.errors` reflects both client-side (zod) and server-side
 * validation without every form re-implementing the merge itself.
 *
 * Usage:
 *   const { fieldErrors } = useApiFormError(error)
 *   useSyncApiFieldErrors(fieldErrors, setError)
 */
export const useSyncApiFieldErrors = <TFieldValues extends FieldValues>(
    fieldErrors: Record<string, string>,
    setError: UseFormSetError<TFieldValues>
) => {
    useEffect(() => {
        Object.entries(fieldErrors).forEach(([name, message]) => {
            setError(name as Path<TFieldValues>, { type: 'server', message })
        })
    }, [fieldErrors, setError])
}

export default useSyncApiFieldErrors
