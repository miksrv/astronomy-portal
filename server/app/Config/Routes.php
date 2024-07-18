<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('weather/current', 'Weather::current');
$routes->get('weather/statistic', 'Weather::statistic');
$routes->options('weather/(:any)', 'Weather');

// Events
$routes->get('events', 'Events::list');
$routes->get('events/upcoming', 'Events::upcoming');
$routes->get('events/(:any)', 'Events::show/$1');
$routes->post('events/booking', 'Events::booking');
$routes->post('events/cancel', 'Events::cancel');
$routes->post('events/upload/(:alphanum)', 'Events::upload/$1');
$routes->options('events', 'Events');
$routes->options('events/(:any)', 'Events');

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
$routes->options('category', 'Category');
$routes->options('category/(:num)', 'Category');

$routes->get('author', 'Author::list');
$routes->post('author', 'Author::create');
$routes->patch('author/(:num)', 'Author::update/$1');
$routes->delete('author/(:num)', 'Author::delete/$1');
$routes->options('author', 'Author');
$routes->options('author/(:num)', 'Author');

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

$routes->post('fits/data', 'Fits::data');
$routes->post('fits/image', 'Fits::image');
$routes->options('fits/(:any)', 'Fits');

$routes->get('sensors', 'Sensors::list');

$routes->get('camera/(:num)', 'Camera::show/$1');