/**
 * Mirrors the fixed privilege catalog in `server/app/Enums/Permission.php`.
 * This is the one place backend and frontend duplicate each other in the
 * roles/privileges system — adding a new privilege in code means updating
 * both files. Everywhere else, access checks read `user.permissions`
 * (returned by `/auth/me`), not this list directly.
 */
export enum Permission {
    RELAY_CONTROL = 'relay.control',
    OBJECTS_MANAGE = 'objects.manage',
    PHOTOS_MANAGE = 'photos.manage',
    MAILINGS_MANAGE = 'mailings.manage',
    USERS_MANAGE = 'users.manage',
    COMMENTS_MODERATE = 'comments.moderate',
    EVENTS_CREATE = 'events.create',
    EVENTS_UPDATE = 'events.update',
    EVENTS_DELETE = 'events.delete',
    EVENTS_GALLERY_UPLOAD = 'events.gallery_upload',
    EVENTS_CHECKIN = 'events.checkin',
    EVENTS_STATISTIC = 'events.statistic',
    EVENTS_REFUND = 'events.refund',
    EVENTS_USERS = 'events.users',
    PIPELINE_MANAGE = 'pipeline.manage',
    PUSH_MANAGE = 'push.manage'
}
