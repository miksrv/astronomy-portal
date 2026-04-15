<?php

namespace App\Controllers;

use App\Entities\MailingEntity;
use App\Libraries\EmailLibrary;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\MailingEmailsModel;
use App\Models\MailingsModel;
use App\Models\MailingUnsubscribesModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\I18n\Time;
use Config\Services;
use Exception;

/**
 * Class Mailings
 * @package App\Controllers
 *
 * Manages email newsletter campaigns. All endpoints except unsubscribe require ADMIN role.
 */
class Mailings extends ResourceController
{
    private SessionLibrary $session;
    protected $model;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
        $this->model   = new MailingsModel();
    }

    /**
     * GET /mailings
     * List all campaigns ordered by created_at DESC (ADMIN only).
     */
    public function list(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $mailings = $this->model
                ->orderBy('created_at', 'DESC')
                ->findAll();

            $items = array_map(fn($m) => [
                'id'         => $m->id,
                'subject'    => $m->subject,
                'status'     => $m->status,
                'totalCount' => (int) $m->total_count,
                'sentCount'  => (int) $m->sent_count,
                'errorCount' => (int) $m->error_count,
                'createdAt'  => $m->created_at,
                'sentAt'     => $m->sent_at,
            ], $mailings);

            return $this->respond([
                'count' => count($items),
                'items' => $items,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /mailings/:id
     * Get single campaign with full data (ADMIN only).
     */
    public function show($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $mailing = $this->model->find($id);

            if (!$mailing) {
                return $this->failNotFound();
            }

            return $this->respond([
                'id'         => $mailing->id,
                'subject'    => $mailing->subject,
                'content'    => $mailing->content,
                'image'      => $mailing->image,
                'status'     => $mailing->status,
                'totalCount' => (int) $mailing->total_count,
                'sentCount'  => (int) $mailing->sent_count,
                'errorCount' => (int) $mailing->error_count,
                'createdBy'  => $mailing->created_by,
                'createdAt'  => $mailing->created_at,
                'updatedAt'  => $mailing->updated_at,
                'sentAt'     => $mailing->sent_at,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /mailings
     * Create a new draft campaign (ADMIN only).
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'subject' => 'required|string|max_length[255]',
            'content' => 'required|string',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $mailing             = new MailingEntity();
            $mailing->subject    = $input['subject'];
            $mailing->content    = $input['content'];
            $mailing->status     = MailingEntity::STATUS_DRAFT;
            $mailing->created_by = $this->session->user->id;

            $this->model->save($mailing);

            $mailingId = $this->model->getInsertID();
            $created   = $this->model->find($mailingId);

            return $this->respondCreated($created);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * PATCH /mailings/:id
     * Update a draft campaign (ADMIN only, only when status = draft).
     */
    public function update($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $mailing = $this->model->find($id);

        if (!$mailing) {
            return $this->failNotFound();
        }

        if ($mailing->status !== MailingEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('Mailings.onlyDraftEditable'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'subject' => 'if_exist|string|max_length[255]',
            'content' => 'if_exist|string',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $updateData = [];


            if (isset($input['subject'])) {
                $updateData['subject'] = $input['subject'];
            }

            if (isset($input['content'])) {
                $updateData['content'] = $input['content'];
            }

            if (!empty($updateData)) {
                $this->model->update($id, $updateData);
            }

            return $this->respond($this->model->find($id));
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * DELETE /mailings/:id
     * Soft-delete a draft campaign (ADMIN only, only when status = draft).
     */
    public function delete($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $mailing = $this->model->find($id);

        if (!$mailing) {
            return $this->failNotFound();
        }

        if ($mailing->status !== MailingEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('Mailings.onlyDraftDeletable'));
        }

        try {
            // Remove attachments directory if it exists
            $attachDir = FCPATH . 'attachments/' . $id;

            if (is_dir($attachDir)) {
                foreach (glob($attachDir . '/*') as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }

                rmdir($attachDir);
            }

            $this->model->delete($id);

            return $this->respondDeleted(['id' => $id]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /mailings/:id/upload
     * Upload an image attachment for a campaign (ADMIN only).
     */
    public function upload($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $mailing = $this->model->find($id);

        if (!$mailing) {
            return $this->failNotFound();
        }

        $file = $this->request->getFile('image') ?? $this->request->getFile('upload');

        if (!$file || !$file->isValid()) {
            return $this->failValidationErrors(lang('General.fileUploadFailed'));
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->failValidationErrors(lang('General.invalidFileType'));
        }

        try {
            $uploadDir = FCPATH . 'attachments/' . $id . '/';

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $newName = $file->getRandomName();
            $file->move($uploadDir, $newName, true);

            $imagePath = 'attachments/' . $id . '/' . $newName;

            $this->model->update($id, ['image' => $imagePath]);

            return $this->respond([
                'image' => '/' . $imagePath,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /mailings/:id/test
     * Send a test email immediately to the requesting admin (ADMIN only).
     */
    public function test($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $mailing = $this->model->find($id);

        if (!$mailing) {
            return $this->failNotFound();
        }

        if (empty($this->session->user->email)) {
            return $this->failValidationErrors(lang('Mailings.noAdminEmail'));
        }

        try {
            $locale  = $this->session->user->locale ?? 'ru';
            $siteUrl = rtrim(getenv('app.siteUrl'), '/');
            $apiUrl  = rtrim(getenv('app.baseURL'), '/');

            $imageUrl = null;

            if (!empty($mailing->image)) {
                $imageUrl = $apiUrl . '/' . $mailing->image;
            }

            $body = view('email_newsletter', [
                'subject'        => $mailing->subject,
                'content'        => $mailing->content,
                'imageUrl'       => $imageUrl,
                'unsubscribeUrl' => $siteUrl . '/unsubscribe?mail=test',
                'locale'         => $locale,
            ]);

            $emailLibrary = new EmailLibrary();
            $emailLibrary->send(
                $this->session->user->email,
                '[TEST] ' . $mailing->subject,
                $body
            );

            return $this->respond(['success' => true]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('Mailings.testEmailFailed'));
        }
    }

    /**
     * POST /mailings/:id/send
     * Launch a campaign: enqueue all eligible users (ADMIN only).
     */
    public function send($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if ($this->session->user->role !== 'admin') {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $mailing = $this->model->find($id);

        if (!$mailing) {
            return $this->failNotFound();
        }

        if ($mailing->status !== MailingEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('Mailings.onlyDraftLaunchable'));
        }

        try {
            $usersModel = new UsersModel();
            $users      = $usersModel->getNewsletterSubscribers();

            $mailingEmailsModel = new MailingEmailsModel();
            $insertBatch        = [];

            $now = date('Y-m-d H:i:s');

            foreach ($users as $user) {
                $insertBatch[] = [
                    'id'         => uniqid(),  // generateId callback does not run on insertBatch
                    'mailing_id' => $id,
                    'user_id'    => $user['id'],
                    'email'      => $user['email'],
                    'locale'     => $user['locale'] ?? 'ru',
                    'status'     => 'queued',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            $count = count($insertBatch);

            if ($count > 0) {
                // Insert in chunks to avoid overly large queries
                foreach (array_chunk($insertBatch, 200) as $chunk) {
                    $mailingEmailsModel->insertBatch($chunk);
                }
            }

            $this->model->update($id, [
                'status'      => MailingEntity::STATUS_SENDING,
                'total_count' => $count,
                'sent_at'     => Time::now()->toDateTimeString(),
            ]);

            return $this->respond(['queued' => $count]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /mailings/unsubscribe?mail=<mailing_email_id>
     * Public endpoint — no auth required.
     * Marks the user as unsubscribed and logs an audit record.
     */
    public function unsubscribe(): ResponseInterface
    {
        $mailId = $this->request->getGet('mail', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (empty($mailId)) {
            return $this->failValidationErrors(lang('Mailings.missingMailParam'));
        }

        try {
            $mailingEmailsModel = new MailingEmailsModel();
            $mailingEmail       = $mailingEmailsModel->find($mailId);

            if (!$mailingEmail) {
                return $this->failNotFound(lang('Mailings.unsubscribeLinkNotFound'));
            }

            $usersModel = new UsersModel();
            $user       = $usersModel->find($mailingEmail->user_id);

            if ($user) {
                // Merge subscribe_newsletter=false into existing settings array
                $currentSettings = is_array($user->settings) ? $user->settings : [];

                $currentSettings['subscribe_newsletter'] = false;

                $usersModel->update($user->id, [
                    'settings' => json_encode($currentSettings),
                ]);
            }

            // Insert audit record
            $unsubscribesModel = new MailingUnsubscribesModel();
            $unsubscribesModel->insert([
                'mailing_email_id' => $mailId,
                'user_id'          => $mailingEmail->user_id,
                'email'            => $mailingEmail->email,
            ]);

            return $this->respond([
                'success' => true,
                'message' => lang('Mailings.unsubscribeSuccess'),
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }
}
