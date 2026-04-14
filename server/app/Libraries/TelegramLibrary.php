<?php

namespace App\Libraries;

use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;

class TelegramLibrary
{
    private string $botKey;
    private string $chatId;

    public function __construct()
    {
        $this->botKey = (string) getenv('app.telegramBotKey');
        $this->chatId = (string) getenv('app.telegramChatID');
    }

    /**
     * Send an HTML-formatted message to the configured Telegram chat.
     *
     * @throws TelegramException
     */
    public function sendMessage(string $text): void
    {
        new Telegram($this->botKey, '');

        Request::sendMessage([
            'chat_id'    => $this->chatId,
            'parse_mode' => 'HTML',
            'text'       => $text,
        ]);
    }
}
