<?php namespace App\Controllers;

use App\Libraries\BlogLibrary;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use ReflectionException;

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