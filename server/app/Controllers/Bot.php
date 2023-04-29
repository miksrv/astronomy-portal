<?php namespace App\Controllers;

use App\Libraries\BlogLibrary;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use ReflectionException;

class Bot extends ResourceController
{
    use ResponseTrait;

    /**
     * Camera image by id
     * @return void
     * @throws ReflectionException
     */
    public function item()
    {
        // Опрашиваем канал в новостями с самого начала
        $blogLibrary = new BlogLibrary();
//        $blogLibrary->getTelegramChannelHistory(
//            'nearspace',
//            20,
//            -20,
//             $newsLibrary->getMaxTelegramNews() // 9 - min telegram post
////              9
//        );

        // Последние записи
        $blogLibrary->getTelegramChannelHistory(
            'nearspace',
            40
        );
    }

    public function statistic()
    {
        $blogLibrary = new BlogLibrary();


        echo '<pre>';
        var_dump($blogLibrary->getTelegramChannelStatistic('nearspace'));
        exit();
    }
}