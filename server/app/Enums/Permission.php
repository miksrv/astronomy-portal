<?php

namespace App\Enums;

/**
 * The fixed catalog of privileges the application understands. This is the
 * single place a new privilege is introduced when new functionality needs
 * one — adding a case here requires no migration; what changes per-deploy is
 * only which roles (a `user_roles` DB row, see RolesModel) are granted it.
 *
 * `user_roles.permissions` stores these as plain strings (the ->value of
 * each case), not as a foreign key — there is no `permissions` table, this
 * enum *is* the catalog.
 */
enum Permission: string
{
    case RELAY_CONTROL         = 'relay.control';
    case OBJECTS_MANAGE        = 'objects.manage';
    case PHOTOS_MANAGE         = 'photos.manage';
    case MAILINGS_MANAGE       = 'mailings.manage';
    case USERS_MANAGE          = 'users.manage';
    case COMMENTS_MODERATE     = 'comments.moderate';
    case EVENTS_CREATE         = 'events.create';
    case EVENTS_UPDATE         = 'events.update';
    case EVENTS_DELETE         = 'events.delete';
    case EVENTS_GALLERY_UPLOAD = 'events.gallery_upload';
    case EVENTS_CHECKIN        = 'events.checkin';
    case EVENTS_STATISTIC      = 'events.statistic';
    case EVENTS_REFUND         = 'events.refund';
    // Viewing the registered-members list for a single event
    // (GET /events/members/:id) — distinct from EVENTS_STATISTIC (the
    // aggregated registrations/statistics table) and from USERS_MANAGE
    // (the site-wide member directory).
    case EVENTS_USERS          = 'events.users';
    // Placeholder for the observatory pipeline management section — no
    // endpoint checks it yet, but the role/assignment can be set up ahead of
    // the feature shipping.
    case PIPELINE_MANAGE       = 'pipeline.manage';
    // All admin `/push-notifications*` endpoints (CRUD on push campaigns,
    // test-send, launch) — distinct from the user-facing POST/DELETE
    // /push/subscribe, which only requires isAuth (any authenticated user
    // may opt in/out of push on their own devices, same as EVENTS_USERS vs
    // USERS_MANAGE above).
    case PUSH_MANAGE           = 'push.manage';
}
