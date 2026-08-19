<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

/** Root - API info endpoint **/
$routes->get('/', static function () {
    return response()->setJSON([
        'name'    => 'Observatory API',
        'version' => '1.0.0',
        'status'  => 'ok'
    ]);
});

/** Camera Controller **/
$routes->get('camera/(:num)', 'Camera::show/$1');

/** Statistic Controller **/
$routes->group('statistic', static function ($routes) {
    // $routes->get('/', 'Statistic::list');
    // $routes->get('statistic/catalog', 'Statistic::catalog');
    // $routes->get('statistic/photos', 'Statistic::photos');
    $routes->get('telescope', 'Statistic::telescope');
    $routes->get('stargazing', 'Statistic::stargazing');
    $routes->options('(:any)', static function () {});
});

/** Auth Controller **/
$routes->group('auth', static function ($routes) {
    $routes->get('me', 'Auth::me');
    $routes->get('google', 'Auth::google', ['filter' => 'ratelimit:auth_oauth,15,300']);
    $routes->get('yandex', 'Auth::yandex', ['filter' => 'ratelimit:auth_oauth,15,300']);
    $routes->get('vk', 'Auth::vk', ['filter' => 'ratelimit:auth_oauth,15,300']);
    //$routes->post('register', 'Auth::register');
    //$routes->post('login', 'Auth::login');
    $routes->post('magic-link', 'Auth::requestMagicLink');
    $routes->post('magic-link/verify', 'Auth::verifyMagicLink');
    $routes->post('logout', 'Auth::logout');
    $routes->patch('profile', 'Auth::updateProfile');
    $routes->options('profile', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Relay Controller **/
$routes->group('relay', static function ($routes) {
    $routes->get('list', 'Relay::list');
    $routes->get('light', 'Relay::light', ['filter' => 'ratelimit:relay_light,6,300']);
    $routes->put('set', 'Relay::set');
    $routes->options('(:any)', static function () {});
});

/** Files Controller **/
$routes->group('files', static function ($routes) {
    $routes->get('(:any)', 'Files::show/$1');
    $routes->options('(:any)', static function () {});
});

/** Equipment Controller **/
$routes->get('equipments', 'Equipment::list');
$routes->options('equipments', static function () {});

/** Categories Controller **/
$routes->get('categories', 'Categories::list');
$routes->options('categories', static function () {});

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

/** Objects Controller **/
$routes->group('fits', static function ($routes) {
    $routes->get('(:any)', 'Fits::show/$1');
    // $routes->post('update', 'Fits::update');
    // $routes->post('image', 'Fits::image');
    $routes->options('(:any)', static function () {});
});


/** Photos Controller **/
$routes->group('photos', static function ($routes) {
    $routes->get('/', 'Photos::list');
    // $routes->get('download/(:any)/(:any)', 'Photos::download/$1/$2');
    $routes->get('(:any)', 'Photos::show/$1');
    // $routes->get('photos/(:any)/(:any)', 'Photos::show/$1/$2');
    $routes->post('/', 'Photos::create');
    $routes->post('(:any)/upload', 'Photos::upload/$1');
    $routes->patch('(:any)', 'Photos::update/$1');
    $routes->delete('(:any)', 'Photos::delete/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
    // $routes->options('photos/(:any)/(:any)', static function () {});
});

/** Events Controller **/
$routes->group('events', static function ($routes) {
    $routes->get('/', 'Events::list');
    $routes->get('upcoming', 'Events::upcoming');
    $routes->get('upcoming/registered', 'Events::upcomingRegistered');
    $routes->get('photos', 'Events::photos');
    $routes->get('(:alphanum)/statistic', 'Events::statistic/$1');
    $routes->get('(:alphanum)/registrations', 'Events::registrations/$1');
    $routes->get('(:alphanum)', 'Events::show/$1');
    $routes->get('members/(:alphanum)', 'Events::members/$1');
    $routes->get('checkin/(:alphanum)', 'Events::checkin/$1');
    $routes->get('ticket/(:alphanum)', 'Events::ticket/$1');

    $routes->post('/', 'Events::create');
    $routes->patch('(:alphanum)', 'Events::update/$1');
    $routes->delete('(:alphanum)', 'Events::delete/$1');
    $routes->post('(:alphanum)/cover', 'Events::cover/$1');

    $routes->post('booking', 'Events::booking', ['filter' => 'ratelimit:events_booking,5,300']);
    $routes->post('cancel', 'Events::cancel');
    $routes->post('payment/status', 'Events::paymentStatus');
    $routes->match(['get', 'post'], 'payment/callback', 'Events::paymentCallback');
    $routes->post('registrations/(:alphanum)/verify-payment', 'Events::verifyRegistrationPayment/$1');
    $routes->post('registrations/(:alphanum)/refund', 'Events::refundRegistrationPayment/$1');
    $routes->post('upload/(:alphanum)', 'Events::upload/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Mailings Controller **/
$routes->group('mailings', static function ($routes) {
    $routes->get('/', 'Mailings::list');
    $routes->post('/', 'Mailings::create');
    $routes->get('unsubscribe', 'Mailings::unsubscribe');  // public — before (:alphanum)
    $routes->get('audiences', 'Mailings::audiences');      // admin — before (:alphanum)
    $routes->get('(:alphanum)', 'Mailings::show/$1');
    $routes->patch('(:alphanum)', 'Mailings::update/$1');
    $routes->delete('(:alphanum)', 'Mailings::delete/$1');
    $routes->post('(:alphanum)/upload', 'Mailings::upload/$1');
    $routes->get('(:alphanum)/preview', 'Mailings::preview/$1');
    $routes->post('(:alphanum)/test', 'Mailings::test/$1', ['filter' => 'ratelimit:mailings_test,5,60']);
    $routes->post('(:alphanum)/send', 'Mailings::send/$1');
    $routes->post('(:alphanum)/cancel', 'Mailings::cancel/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Push Subscriptions Controller (user-facing opt-in/out) **/
$routes->group('push', static function ($routes) {
    $routes->get('vapid-key', 'PushSubscriptions::vapidKey');
    $routes->post('subscribe', 'PushSubscriptions::subscribe', ['filter' => 'ratelimit:push_subscribe,10,60']);
    $routes->delete('subscribe', 'PushSubscriptions::unsubscribe');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Push Notifications Controller (admin campaigns) **/
$routes->group('push-notifications', static function ($routes) {
    $routes->get('/', 'PushNotifications::list');
    $routes->post('/', 'PushNotifications::create');
    $routes->get('audiences', 'PushNotifications::audiences'); // before (:alphanum)
    $routes->get('(:alphanum)', 'PushNotifications::show/$1');
    $routes->patch('(:alphanum)', 'PushNotifications::update/$1');
    $routes->delete('(:alphanum)', 'PushNotifications::delete/$1');
    $routes->post('(:alphanum)/upload', 'PushNotifications::upload/$1');
    $routes->post('(:alphanum)/test', 'PushNotifications::test/$1', ['filter' => 'ratelimit:push_notifications_test,5,60']);
    $routes->post('(:alphanum)/send', 'PushNotifications::send/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Members Controller **/
$routes->group('members', static function ($routes) {
    $routes->get('/', 'Members::list');
    $routes->get('(:alphanum)/events', 'Members::events/$1');
    $routes->patch('(:alphanum)/roles', 'Members::updateRoles/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Roles Controller **/
$routes->group('roles', static function ($routes) {
    $routes->get('/', 'Roles::list');
    $routes->get('permissions', 'Roles::permissions'); // before (:num), or it's shadowed by show
    $routes->get('(:num)', 'Roles::show/$1');
    $routes->post('/', 'Roles::create');
    $routes->patch('(:num)', 'Roles::update/$1');
    $routes->delete('(:num)', 'Roles::delete/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Comments Controller **/
$routes->group('comments', static function ($routes) {
    $routes->get('/', 'Comments::index');
    $routes->get('random', 'Comments::random');
    $routes->post('/', 'Comments::create', ['filter' => 'ratelimit:comments_create,10,60']);
    $routes->delete('(:alphanum)', 'Comments::delete/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});

/** Sitemap Controller **/
$routes->group('sitemap', static function ($routes) {
    $routes->get('/', 'Sitemap::index');
    $routes->options('/', static function () {});
});
