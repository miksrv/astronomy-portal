<?php

namespace Config;

/**
 * Telescope jobs (FEAT-30 phase 2, `features/observatory-agent.md` §4). The limits live in
 * `observatory_settings` (editable without a deploy, see `App\Libraries\TelescopeSettings`);
 * what is here is the vocabulary: statuses, the presets of the simple form, sanity bounds.
 */
class Telescope
{
    /**
     * The observatory's time zone: an observing night runs from its local noon to the next one
     * and is named by the date of its evening (the agent's `site.timezone` must be the same)
     */
    public const TIME_ZONE = 'Asia/Yekaterinburg';

    /** A visitor's job from the site (it has an author) */
    public const SOURCE_SITE = 'site';
    /** The observatory agent's own job: the supernova patrol (no author) */
    public const SOURCE_PATROL = 'patrol';
    public const SOURCES       = [self::SOURCE_SITE, self::SOURCE_PATROL];

    public const STATUS_PENDING   = 'pending';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_REJECTED  = 'rejected';
    public const STATUS_QUEUED    = 'queued';
    public const STATUS_RUNNING   = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED   = 'expired';
    public const STATUS_FAILED    = 'failed';

    /** Count against the author's active-jobs limit */
    public const ACTIVE_STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_QUEUED, self::STATUS_RUNNING];

    /** Never change again (late frames are still recorded) */
    public const FINAL_STATUSES = [self::STATUS_REJECTED, self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_EXPIRED, self::STATUS_FAILED];

    /** Seen by everyone on /observatory/jobs; rejected and cancelled jobs only by the author and managers */
    public const PUBLIC_STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_QUEUED, self::STATUS_RUNNING, self::STATUS_COMPLETED, self::STATUS_EXPIRED, self::STATUS_FAILED];

    /** The observatory has (or may have) the job: approved and not final */
    public const AGENT_STATUSES = [self::STATUS_APPROVED, self::STATUS_QUEUED, self::STATUS_RUNNING];

    /**
     * Presets of the simple form: filter (a wheel slot name) => [exposure s, count]. Each fits the
     * default 2 h limit, so a user's preset job always passes it.
     */
    public const PRESETS = [
        'L'    => ['L' => [300, 20]],
        'LRGB' => ['L' => [300, 8], 'R' => [300, 5], 'G' => [300, 5], 'B' => [300, 5]],
        'RGB'  => ['R' => [300, 8], 'G' => [300, 8], 'B' => [300, 8]],
        'HOO'  => ['H' => [600, 6], 'O' => [600, 6]],
        'SHO'  => ['S' => [600, 4], 'H' => [600, 4], 'O' => [600, 4]],
    ];

    /** Bounds no job passes, admins' included (the limits from the settings are stricter for users) */
    public const MAX_EXPOSURE_SECONDS = 1800;
    public const MAX_FRAMES_PER_FILTER = 500;
    public const MAX_MIN_ALTITUDE      = 80;
    public const MAX_TARGET_NAME       = 60;
    public const MAX_REASON            = 500;
}
