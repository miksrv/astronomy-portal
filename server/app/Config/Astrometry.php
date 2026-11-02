<?php

namespace Config;

/**
 * nova.astrometry.net plate solving. The API key is personal: sign in at
 * https://nova.astrometry.net and copy it from https://nova.astrometry.net/profile into
 * `.env` as `astrometry.apiKey`. Without a key `photos:solve` does nothing.
 */
class Astrometry
{
    public const API_URL = 'https://nova.astrometry.net/';

    public static function apiKey(): string
    {
        return (string) getenv('astrometry.apiKey');
    }
}
