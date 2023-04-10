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
//$routes->get('/', 'Home::index');

$routes->post('auth/register', 'Auth::register');
$routes->post('auth/login', 'Auth::login');

$routes->get('statistic', 'Statistic::list');

$routes->get('catalog', 'Catalog::list');
$routes->get('catalog/(:any)', 'Catalog::show/$1');
$routes->post('catalog', 'Catalog::create');
$routes->patch('catalog/(:any)', 'Catalog::update/$1');
$routes->delete('catalog/(:any)', 'Catalog::delete/$1');

$routes->get('photo', 'Photo::list');
$routes->get('photo/(:any)', 'Photo::item/$1');
$routes->post('photo/(:any)', 'Photo::create/$1');
$routes->post('photo/(:any)/upload', 'Photo::upload/$1');
$routes->patch('photo/(:any)', 'Photo::update/$1');
$routes->delete('photo/(:any)', 'Photo::delete/$1');


$routes->get('relay', 'Relay::list');
$routes->put('relay/(:num)', 'Relay::set');

$routes->get('camera/(:num)', 'Camera::item/$1');
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
