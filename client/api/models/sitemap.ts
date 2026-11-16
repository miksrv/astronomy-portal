export interface SiteMap {
    id: string
    /** ISO 8601 with the offset, e.g. "2025-01-11T08:55:52+05:00"; the object is the pre-4.17.1 API shape */
    updated?: string | { date?: string } | null
}
