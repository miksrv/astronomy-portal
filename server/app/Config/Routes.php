<?php

namespace Config;

// Create a new instance of our RouteCollection class.
$routes = Services::routes();

/*
 * --------------------------------------------------------------------
 * Router Setup
 * --------------------------------------------------------------------
 */
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Home');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(false);
$routes->set404Override();
// The Auto Routing (Legacy) is very dangerous. It is easy to create vulnerable apps
// where controller filters or CSRF protection are bypassed.
// If you don't want to define all routes, please use the Auto Routing (Improved).
// Set `$autoRoutesImproved` to true in `app/Config/Feature.php` and set the following to true.
// $routes->setAutoRoute(false);

/*
 * --------------------------------------------------------------------
 * Route Definitions
 * --------------------------------------------------------------------
 */

// We get a performance increase by specifying the default
// route since we don't have to scan directories.

//$routes->post('cron/update_telegram_posts', 'Cron::update_telegram_posts');
$routes->get('cron/telegram', 'Cron::update_telegram_posts');
$routes->get('cron/optimize_images', 'Cron::optimize_photos');
$routes->options('cron/telegram', 'Cron');

$routes->get('weather/current', 'Weather::current');
$routes->get('weather/statistic', 'Weather::statistic');
$routes->options('weather/current', 'Weather::current');
$routes->options('weather/statistic', 'Weather::statistic');

$routes->get('statistic', 'Statistic::list');
$routes->get('statistic/catalog', 'Statistic::catalog');
$routes->get('statistic/photos', 'Statistic::photos');
$routes->get('statistic/telescope', 'Statistic::telescope');
$routes->options('statistic', 'Statistic');
$routes->options('statistic/(:any)', 'Statistic');

$routes->get('catalog', 'Catalog::list');
$routes->get('catalog/(:any)', 'Catalog::show/$1');
$routes->post('catalog', 'Catalog::create');
$routes->patch('catalog/(:any)', 'Catalog::update/$1');
$routes->delete('catalog/(:any)', 'Catalog::delete/$1');
$routes->options('catalog', 'Catalog');
$routes->options('catalog/(:any)', 'Catalog');

$routes->get('category', 'Category::list');
$routes->post('category', 'Category::create');
$routes->patch('category/(:num)', 'Category::update/$1');
$routes->delete('category/(:num)', 'Category::delete/$1');
$routes->options('category', 'Category::create');
$routes->options('category/(:num)', 'Category::update/$1');

$routes->get('author', 'Author::list');
$routes->post('author', 'Author::create');
$routes->patch('author/(:num)', 'Author::update/$1');
$routes->delete('author/(:num)', 'Author::delete/$1');
$routes->options('author', 'Author::create');
$routes->options('author/(:num)', 'Author::update/$1');

$routes->get('photo', 'Photo::list');
$routes->get('photo/download/(:any)/(:any)', 'Photo::download/$1/$2');
$routes->get('photo/(:any)', 'Photo::show/$1');
$routes->get('photo/(:any)/(:any)', 'Photo::show/$1/$2');
$routes->post('photo', 'Photo::create');
$routes->post('photo/upload', 'Photo::upload');
$routes->patch('photo/(:any)', 'Photo::update/$1');
$routes->delete('photo/(:any)', 'Photo::delete/$1');
$routes->options('photo', 'Photo');
$routes->options('photo/(:any)', 'Photo');
$routes->options('photo/(:any)/(:any)', 'Photo');
$routes->options('photo/upload', 'Photo');

$routes->get('auth/me', 'Auth::me');
$routes->post('auth/register', 'Auth::register');
$routes->post('auth/login', 'Auth::login');
$routes->options('auth/(:any)', 'Auth::me');

$routes->get('blog', 'Blog::list');
$routes->get('blog/statistic', 'Blog::statistic');
$routes->get('blog/popular', 'Blog::popular');
$routes->options('blog', 'Blog');
$routes->options('blog/(:any)', 'Blog');

$routes->get('relay/list', 'Relay::list');
$routes->get('relay/state', 'Relay::state');
$routes->put('relay/set', 'Relay::set');
$routes->options('relay/list', 'Relay::list');
$routes->options('relay/state', 'Relay::state');
$routes->options('relay/set', 'Relay::set');

$routes->post('fits/data', 'Fits::fits');
$routes->post('fits/upload', 'Fits::upload');
$routes->options('fits/data', 'Fits::fits');
$routes->options('fits/upload', 'Fits::upload');

$routes->get('sensors', 'Sensors::list');

$routes->get('camera/(:num)', 'Camera::show/$1');
/*
 * --------------------------------------------------------------------
 * Additional Routing
 * --------------------------------------------------------------------
 *
 * There will often be times that you need additional routing and you
 * need it to be able to override any defaults in this file. Environment
 * based routes is one such time. require() additional route files here
 * to make that happen.
 *
 * You will have access to the $routes object within that file without
 * needing to reload it.
 */
if (is_file(APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php')) {
    require APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php';
}
