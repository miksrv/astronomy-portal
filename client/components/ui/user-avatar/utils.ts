export const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const second = parts[1]?.[0] ?? ''

    return (first + second).toUpperCase()
}
