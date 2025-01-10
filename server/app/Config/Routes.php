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

$routes->get('catalog', 'Catalog::list');
$routes->get('catalog/(:any)', 'Catalog::show/$1');
$routes->post('catalog', 'Catalog::create');
$routes->patch('catalog/(:any)', 'Catalog::update/$1');
$routes->delete('catalog/(:any)', 'Catalog::delete/$1');
$routes->options('catalog', 'Catalog');
$routes->options('catalog/(:any)', 'Catalog');

$routes->get('author', 'Author::list');
$routes->post('author', 'Author::create');
$routes->patch('author/(:num)', 'Author::update/$1');
$routes->delete('author/(:num)', 'Author::delete/$1');
$routes->options('author', 'Author');
$routes->options('author/(:num)', 'Author');

$routes->get('auth/me', 'Auth::me');
$routes->get('auth/google', 'Auth::google');
$routes->get('auth/yandex', 'Auth::yandex');
$routes->get('auth/vk', 'Auth::vk');
//$routes->post('auth/register', 'Auth::register');
//$routes->post('auth/login', 'Auth::login');
$routes->options('auth/(:any)', 'Auth');

$routes->get('relay/list', 'Relay::list');
$routes->get('relay/light', 'Relay::light');
$routes->put('relay/set', 'Relay::set');
$routes->options('relay/(:any)', 'Relay');

$routes->get('fits/(:any)', 'Fits::show/$1');
$routes->post('fits/update', 'Fits::update');
$routes->post('fits/image', 'Fits::image');
$routes->options('fits/(:any)', 'Fits');

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
$routes->get('objects', 'Objects::list');
$routes->get('objects/(:any)', 'Objects::show/$1');
$routes->post('objects', 'Objects::create');
$routes->patch('objects/(:any)', 'Objects::update/$1');
$routes->delete('objects/(:any)', 'Objects::delete/$1');
$routes->options('objects', 'Objects');
$routes->options('objects/(:any)', 'Objects');

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
