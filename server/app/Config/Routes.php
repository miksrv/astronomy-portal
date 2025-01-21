<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('statistic', 'Statistic::list');
$routes->get('statistic/catalog', 'Statistic::catalog');
$routes->get('statistic/photos', 'Statistic::photos');
$routes->get('statistic/telescope', 'Statistic::telescope');
$routes->options('statistic', 'Statistic');
$routes->options('statistic/(:any)', 'Statistic');

/**  Auth Controller **/
$routes->group('auth', static function ($routes) {
    $routes->get('me', 'Auth::me');
    $routes->get('google', 'Auth::google');
    $routes->get('yandex', 'Auth::yandex');
    $routes->get('vk', 'Auth::vk');
    //$routes->post('register', 'Auth::register');
    //$routes->post('login', 'Auth::login');
    $routes->options('(:any)', static function () {});
});

/** Relay Controller **/
$routes->group('relay', static function ($routes) {
    $routes->get('list', 'Relay::list');
    $routes->get('light', 'Relay::light');
    $routes->put('set', 'Relay::set');
    $routes->options('(:any)', static function () {});
});

$routes->get('sensors', 'Sensors::list');

$routes->get('camera/(:num)', 'Camera::show/$1');

$routes->get('system/recalculate/fits', 'System::recalculateFitsFilters');

/** Files Controller **/
$routes->get('files/(:any)', 'Files::show/$1');
$routes->post('files/update', 'Files::update');
$routes->post('files/image', 'Files::image');
$routes->options('files/(:any)', 'Files');

/** Equipment Controller **/
$routes->get('equipment', 'Equipment::list');
$routes->options('equipment', 'Equipment');

/** Objects Controller **/
$routes->get('categories', 'Categories::list');
$routes->options('categories', 'Categories');

/** Objects Controller **/
$routes->group('objects', static function ($routes) {
    $routes->get('/', 'Objects::list');
    $routes->get('(:any)', 'Objects::show/$1');
    $routes->post('/', 'Objects::create');
    $routes->patch('(:any)', 'Objects::update/$1');
    $routes->delete('(:any)', 'Objects::delete/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

$routes->group('fits', static function ($routes) {
    $routes->get('(:any)', 'Fits::show/$1');
    // $routes->post('update', 'Fits::update');
    // $routes->post('image', 'Fits::image');
    $routes->options('(:any)', static function () {});
});


/** Photos Controller **/
$routes->get('photos', 'Photos::list');
$routes->get('photos/download/(:any)/(:any)', 'Photos::download/$1/$2');
$routes->get('photos/(:any)', 'Photos::show/$1');
$routes->get('photos/(:any)/(:any)', 'Photos::show/$1/$2');
$routes->post('photos', 'Photos::create');
$routes->post('photos/(:any)/upload', 'Photos::upload/$1');
$routes->patch('photos/(:any)', 'Photos::update/$1');
$routes->delete('photos/(:any)', 'Photos::delete/$1');
$routes->options('photos', 'Photos');
$routes->options('photos/(:any)', 'Photos');
$routes->options('photos/(:any)/(:any)', 'Photos');

/** Equipments Controller **/
$routes->get('equipments', 'Equipment::list');
$routes->options('equipments', 'Equipment');

/** Events Controller **/
$routes->get('events', 'Events::list');
$routes->get('events/upcoming', 'Events::upcoming');
$routes->get('events/(:any)', 'Events::show/$1');
$routes->post('events/booking', 'Events::booking');
$routes->post('events/cancel', 'Events::cancel');
$routes->post('events/upload/(:alphanum)', 'Events::upload/$1');
$routes->options('events', 'Events');
$routes->options('events/(:any)', 'Events');
