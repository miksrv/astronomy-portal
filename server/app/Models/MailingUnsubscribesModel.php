<?php

namespace App\Models;

/**
 * MailingUnsubscribesModel
 *
 * Manages the `mailing_unsubscribes` table, which logs email unsubscribe requests.
 * Only a created_at timestamp is recorded; there is no updated_at column, so
 * $updatedField is set to an empty string to suppress CI4's auto-update behaviour.
 * Uses UUID primary keys generated via the beforeInsert callback.
 */
class MailingUnsubscribesModel extends ApplicationBaseModel
{
    protected $table            = 'mailing_unsubscribes';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'mailing_email_id',
        'user_id',
        'email',
    ];

    // Dates — only created_at is stored; updatedField must be empty to avoid errors.
    protected $useTimestamps = true;
    protected $updatedField       = '';

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];
}
