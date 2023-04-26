<?php namespace App\Controllers;

use App\Libraries\NewsLibrary;
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
        $newsLibrary = new NewsLibrary();
        $newsLibrary->getTelegramChannelHistory(
            'nearspace',
            20,
            -20,
            $newsLibrary->getMaxTelegramNews() // 9 - min telegram post
        );
    }
}