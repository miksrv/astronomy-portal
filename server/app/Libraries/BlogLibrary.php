<?php namespace App\Libraries;

use App\Models\BlogMediaModel;
use App\Models\BlogModel;
use ReflectionException;

class BlogLibrary
{
    protected \danog\MadelineProto\API $MadelineProto;

    protected array $supportedMedia = ['messageMediaPhoto', 'messageMediaDocument'];

    function __construct()
    {
        $this->MadelineProto = new \danog\MadelineProto\API('session.madeline');
        $this->MadelineProto->start();
    }

    /**
     * @throws ReflectionException
     */
    function getTelegramChannelHistory(string $peer, int $limit = 5, int $offset = 0, int $offset_id = null): bool
    {
        $messages = $this->MadelineProto->messages->getHistory([
            'peer'       => $peer,
            'limit'      => $limit,
            'add_offset' => $offset,
            'offset_id'  => $offset_id
        ]);

        $this->processChannelMessages($messages);

        return true;
    }

    function getMaxTelegramNews(): int
    {
        $modelNews  = new BlogModel();
        $modelMedia = new BlogMediaModel();

        $max1 = $modelNews->selectMax('telegram_id')->first();
        $max2 = $modelMedia->selectMax('telegram_id')->first();

        return max($max1->telegram_id ?? 0, $max2->telegram_id ?? 0);
    }

    /**
     * @throws ReflectionException
     */
    function processChannelMessages($messages)
    {
        if (!is_array($messages))
            return ;

        $count = 0;

        log_message('notice', "Start parsing Telegram channel messages");

        foreach (array_reverse($messages['messages']) as $message) {
            if (empty($message['id']))
                continue ;

            $count++;

            $groupId = $message['grouped_id'] ?? hexdec(uniqid());

            $this->saveMessageMedia($message, $groupId);
            $this->saveMessage($message, $groupId);
        }

        log_message('notice', "Stop parsing Telegram channel messages, count: {$count}");
    }

    /**
     * @throws ReflectionException
     */
    protected function saveMessageMedia($message, $groupId): bool
    {
        if (empty($message['media']) || !in_array($message['media']['_'], $this->supportedMedia))
            return false;

        $directory = FCPATH . 'news/' . $groupId . '/';

        if (!is_dir($directory))
        {
            mkdir($directory, 0777, TRUE);
        }

        $modelNewsMedia = new BlogMediaModel();
        $findNewsMedia  = $modelNewsMedia->where(['telegram_id' => $message['id']])->first();

        if ($findNewsMedia) {
            log_message('notice', "Updated news media with Telegram ID {$message['id']}");

            return $modelNewsMedia->update(
                $findNewsMedia->id,
                [
                    'views'    => $message['views'] ?? null,
                    'forwards' => $message['forwards'] ?? null,
                ]
            );
        }

        $media = $this->MadelineProto->downloadToDir($message, $directory);

        if (!is_string($media))
            return false;

        $file = new \CodeIgniter\Files\File($media);

        log_message('notice', "Download media file {$file->getFilename()}");
        log_message('notice', "Inserted news media with Telegram ID: {$message['id']}");

        list($width, $height) = getimagesize($file);

        return $modelNewsMedia->insert([
            'blog_id'       => 0,
            'telegram_id'   => $message['id'] ?? 0,
            'telegram_date' => $message['date'] ?? null,
            'group_id'      => $groupId,
            'views'         => $message['views'] ?? null,
            'forwards'      => $message['forwards'] ?? null,
            'file'          => $file->getFilename(),
            'file_type'     => $file->getMimeType(),
            'height'        => $height,
            'width'         => $width,
        ]);
    }

    /**
     * @throws ReflectionException
     */
    protected function saveMessage($message, $groupId): bool
    {
        if (empty($message['message']))
            return false;

        $data = [
            'telegram_id'   => $message['id'] ?? 0,
            'telegram_date' => $message['date'] ?? 0,
            'group_id'      => $groupId,
            'views'         => $message['views'] ?? 0,
            'forwards'      => $message['forwards'] ?? 0,
            'replies'       => $message['replies']['replies'] ?? 0,
            'text'          => $message['message'],
            'reactions'     => json_encode($this->getMessageReactions($message))
        ];

        $modelNews = new BlogModel();
        $findNews  = $modelNews->where(['telegram_id' => $data['telegram_id']])->first();

        if ($findNews) {
            log_message('notice', "Updated news with Telegram ID {$data['telegram_id']}");

            return $modelNews->update(
                $findNews->id,
                [
                    'views'     => $data['views'],
                    'forwards'  => $data['forwards'],
                    'replies'   => $data['replies'],
                    'text'      => $data['text'],
                    'reactions' => $data['reactions'],
                ]
            );
        }

        log_message('notice', "Inserted news with Telegram ID {$data['telegram_id']}");

        return $modelNews->insert($data);
    }

    protected function getMessageReactions($message): array
    {
        if (!isset($message['reactions']['results']) || !is_array($message['reactions']['results'])) return [];
        
        $result = [];

        foreach ($message['reactions']['results'] as $item)
        {
            $result[] = [
                'emoticon' => $item['reaction']['emoticon'],
                'count'    => $item['count']
            ];
        }

        return $result;
    }
}