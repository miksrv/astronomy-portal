<?php namespace App\Controllers;

use App\Libraries\BlogLibrary;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use ReflectionException;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH');
header('Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization');

if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
    die();
}

class Cron extends ResourceController
{
    use ResponseTrait;

    /**
     * Camera image by id
     * @return void
     * @throws ReflectionException
     */
    public function update_telegram_posts()
    {
        // Опрашиваем канал в новостями с самого начала
        $blogLibrary = new BlogLibrary();

        /* Получение новостей с самой первой новости
        $blogLibrary->getTelegramChannelHistory(
            'nearspace',
            20,
            -20,
            $blogLibrary->getMaxTelegramNews() // 9 - min telegram post
            // 9
        );
        */

        // Обновление последних записей
        $blogLibrary->getTelegramChannelHistory(
            'nearspace',
            40
        );
    }

    public function get_telegram_statistic()
    {
        $blogLibrary = new BlogLibrary();

        echo '<pre>';
        var_dump($blogLibrary->getTelegramChannelStatistic('nearspace'));
        exit();
    }
}