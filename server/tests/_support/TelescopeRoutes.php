<?php

namespace Tests\Support;

/**
 * The telescope job routes (`/telescope/*`), commented out in `app/Config/Routes.php` until the
 * feature is presented (as the site's UI, `TELESCOPE_JOBS_ENABLED`): a feature test that calls
 * them registers them itself. Keep in step with the commented block there.
 *
 * For a class using `FeatureTestTrait`.
 */
trait TelescopeRoutes
{
    protected function withTelescopeRoutes(): void
    {
        $this->withRoutes([
            ['GET', 'telescope/config', '\App\Controllers\Telescope::config'],
            ['GET', 'telescope/tonight', '\App\Controllers\Telescope::tonight'],
            ['GET', 'telescope/jobs', '\App\Controllers\Telescope::list'],
            ['POST', 'telescope/jobs', '\App\Controllers\Telescope::create'],
            ['GET', 'telescope/jobs/(:alphanum)', '\App\Controllers\Telescope::show/$1'],
            ['PATCH', 'telescope/jobs/(:alphanum)', '\App\Controllers\Telescope::update/$1'],
            ['DELETE', 'telescope/jobs/(:alphanum)', '\App\Controllers\Telescope::cancel/$1'],
            ['POST', 'telescope/jobs/(:alphanum)/approve', '\App\Controllers\Telescope::approve/$1'],
            ['POST', 'telescope/jobs/(:alphanum)/reject', '\App\Controllers\Telescope::reject/$1'],
            ['POST', 'telescope/jobs/(:alphanum)/remove', '\App\Controllers\Telescope::remove/$1'],
            ['POST', 'telescope/jobs/(:alphanum)/repeat', '\App\Controllers\Telescope::repeat/$1'],
        ]);
    }
}
