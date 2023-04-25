<?php namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Bot extends ResourceController
{
    use ResponseTrait;

    /**
     * Camera image by id
     * @return void
     */
    public function item()
    {
        $MadelineProto = new \danog\MadelineProto\API('session.madeline');
        $MadelineProto->start();

        $me = $MadelineProto->getSelf();

        \danog\MadelineProto\Logger::log($me);

        /* Получим историю сообщений */
        $messages = $MadelineProto->messages->getHistory([
            /* Название канала, без @ */
            'peer' => 'nearspace',
//            'offset_id' => 0,
//            'offset_date' => 0,
            'add_offset' => 80,
            'limit' => 80,
        ]);

        /* Сообщения, сортировка по дате (новые сверху) */
        foreach ($messages['messages'] as $message)
        {
            //$MadelineProto->downloadToDir($message,  FCPATH);

            // Это картинка или медиа
//            if (!$message['message']) continue;

            $result = (object) [
                'id'       => $message['id'] ?? null,
                'date'     => $message['date'] ?? null,
                'text'     => $message['message'] ?? null,
                'group'    => $message['grouped_id'] ?? null,
                'views'    => $message['views'] ?? null,
                'forwards' => $message['forwards'] ?? null,
                'replies'  => $message['replies']['replies'] ?? null,
                'reactions'=> $this->get_reactions($message['reactions']['results'] ?? null),
            ];


            echo '<pre>';
            var_dump($result);
            echo '</pre>';
        }

        exit();
    }

    function get_reactions($list): array
    {
        if (!is_array($list) || empty($list))
            return [];

        $result = [];

        foreach ($list as $item)
        {
            $result[] = [
                'emoticon' => $item['reaction']['emoticon'],
                'count'    => $item['count']
            ];
        }

        return $result;
    }
}