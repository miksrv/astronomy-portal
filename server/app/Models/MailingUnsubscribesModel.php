<?php

namespace App\Models;

class MailingUnsubscribesModel extends ApplicationBaseModel
{
    protected $table            = 'mailing_unsubscribes';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useTimestamps    = true;
    protected $updatedField     = '';  // only created_at, no updated_at

    protected $allowedFields = [
        'mailing_email_id',
        'user_id',
        'email',
    ];

    protected $beforeInsert = ['generateId'];
}
