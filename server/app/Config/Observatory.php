<?php

namespace Config;

/**
 * The observatory agent (FEAT-30): the Python service on the observatory PC that pushes the
 * status snapshot. It authenticates with `Authorization: Bearer <observatory.agentToken>`
 * (at least 32 random bytes in `.env`, the same value in the agent's config).
 */
class Observatory
{
    /** A snapshot older than this means "no link to the observatory" */
    public const ONLINE_SECONDS = 180;

    /** Largest snapshot body the API accepts */
    public const MAX_SNAPSHOT_BYTES = 32768;

    /** Events older than this are pruned */
    public const EVENTS_KEEP_DAYS = 90;

    public static function agentToken(): string
    {
        return (string) getenv('observatory.agentToken');
    }
}
