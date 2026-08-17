<?php

namespace App\Controllers;

use App\Entities\PushNotificationEntity;
use App\Enums\Permission;
use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Libraries\WebPushExpiredSubscriptionException;
use App\Libraries\WebPushLibrary;
use App\Models\EventsModel;
use App\Models\EventsUsersModel;
use App\Models\PushNotificationDeliveriesModel;
use App\Models\PushNotificationsModel;
use App\Models\PushSubscriptionsModel;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\I18n\Time;
use Config\Database;
use Config\Services;
use Exception;

/**
 * Class PushNotifications
 * @package App\Controllers
 *
 * Manages Web Push notification campaigns. All endpoints require the
 * push.manage privilege — a deliberate mirror of Mailings.php's admin
 * workflow (draft -> test -> launch -> cron drains the queue), but each
 * "recipient" is a push_subscriptions row rather than a user (see
 * PushNotificationDeliveriesModel doc-block).
 */
class PushNotifications extends ResourceController
{
    private SessionLibrary $session;
    protected $model;

    public function __construct()
    {
        LocaleLibrary::init();

        $this->session = new SessionLibrary();
        $this->model   = new PushNotificationsModel();
    }

    /**
     * GET /push-notifications
     * List all campaigns ordered by created_at DESC.
     */
    public function list(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $notifications = $this->model
                ->orderBy('created_at', 'DESC')
                ->findAll();

            $items = array_map(fn($n) => [
                'id'         => $n->id,
                'title'      => $n->title,
                'status'     => $n->status,
                'totalCount' => (int) $n->total_count,
                'sentCount'  => (int) $n->sent_count,
                'errorCount' => (int) $n->error_count,
                'createdAt'  => $n->created_at,
                'sentAt'     => $n->sent_at,
            ], $notifications);

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
     * GET /push-notifications/:id
     * Get single campaign with full data.
     */
    public function show($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $notification = $this->model->find($id);

            if (!$notification) {
                return $this->failNotFound();
            }

            // Resolve audience label and count
            $audienceType    = $notification->audience_type ?? 'all';
            $audienceEventId = $notification->audience_event_id;
            $audienceLabelRu = 'Все пользователи';
            $audienceLabelEn = 'All Users';
            $audienceCount   = 0;

            if ($audienceType === 'event' && !empty($audienceEventId)) {
                // Resolve the event's own title independently of the
                // subscriber-count join below: getPushAudienceByEventId()
                // inner-joins push_subscriptions, so it returns nothing for
                // an event with zero push-subscribed registrants — falling
                // back to the "all users" label here would make the
                // response internally inconsistent (audienceType/
                // audienceEventId still say "event", but the label/count
                // would claim "all users"/0).
                $eventsModel = new EventsModel();
                $event       = $eventsModel->find($audienceEventId);

                if ($event) {
                    $audienceLabelRu = $event->title_ru ?? $event->title_en ?? '';
                    $audienceLabelEn = $event->title_en ?? $event->title_ru ?? '';
                }

                $eventsUsersModel = new EventsUsersModel();
                $row              = $eventsUsersModel->getPushAudienceByEventId($audienceEventId);
                $audienceCount    = (int) ($row['user_count'] ?? 0);
            } else {
                $usersModel    = new UsersModel();
                $subscribers   = $usersModel->getPushSubscribers();
                $audienceCount = count($subscribers);
            }

            return $this->respond([
                'id'              => $notification->id,
                'title'           => $notification->title,
                'body'            => $notification->body,
                'icon'            => $notification->icon,
                'url'             => $notification->url,
                'status'          => $notification->status,
                'totalCount'      => (int) $notification->total_count,
                'sentCount'       => (int) $notification->sent_count,
                'errorCount'      => (int) $notification->error_count,
                'createdBy'       => $notification->created_by,
                'createdAt'       => $notification->created_at,
                'updatedAt'       => $notification->updated_at,
                'sentAt'          => $notification->sent_at,
                'audienceType'    => $audienceType,
                'audienceEventId' => $audienceEventId,
                'audienceLabelRu' => $audienceLabelRu,
                'audienceLabelEn' => $audienceLabelEn,
                'audienceCount'   => $audienceCount,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /push-notifications
     * Create a new draft campaign.
     */
    public function create(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'title'           => 'required|string|max_length[255]',
            'body'            => 'required|string',
            'url'             => 'if_exist|valid_url_strict',
            'audienceType'    => 'if_exist|in_list[all,event]',
            'audienceEventId' => 'if_exist|permit_empty|string|max_length[15]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $audienceType    = $input['audienceType'] ?? 'all';
        $audienceEventId = $input['audienceEventId'] ?? null;

        if ($audienceType === 'event' && empty($audienceEventId)) {
            return $this->failValidationErrors([
                'audienceEventId' => lang('PushNotifications.audienceEventIdRequired'),
            ]);
        }

        // Reset event ID if type is 'all'
        if ($audienceType === 'all') {
            $audienceEventId = null;
        }

        try {
            $notification                    = new PushNotificationEntity();
            $notification->title             = $input['title'];
            $notification->body              = $input['body'];
            $notification->url               = $input['url'] ?? null;
            $notification->status            = PushNotificationEntity::STATUS_DRAFT;
            $notification->audience_type     = $audienceType;
            $notification->audience_event_id = $audienceEventId;
            $notification->created_by        = $this->session->user->id;

            $this->model->save($notification);

            $notificationId = $this->model->getInsertID();
            $created        = $this->model->find($notificationId);

            return $this->respondCreated($created);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * PATCH /push-notifications/:id
     * Update a draft campaign (only when status = draft).
     */
    public function update($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $notification = $this->model->find($id);

        if (!$notification) {
            return $this->failNotFound();
        }

        if ($notification->status !== PushNotificationEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('PushNotifications.onlyDraftEditable'));
        }

        $input = $this->request->getJSON(true);

        $rules = [
            'title'           => 'if_exist|string|max_length[255]',
            'body'            => 'if_exist|string',
            'url'             => 'if_exist|valid_url_strict',
            'audienceType'    => 'if_exist|in_list[all,event]',
            'audienceEventId' => 'if_exist|permit_empty|string|max_length[15]',
        ];

        $this->validator = Services::Validation()->setRules($rules);

        if (!$this->validator->run($input)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        // Validate audience combination when audienceType is being set
        if (isset($input['audienceType'])) {
            $audienceType    = $input['audienceType'];
            $audienceEventId = $input['audienceEventId'] ?? null;

            if ($audienceType === 'event' && empty($audienceEventId)) {
                return $this->failValidationErrors([
                    'audienceEventId' => lang('PushNotifications.audienceEventIdRequired'),
                ]);
            }
        }

        try {
            $updateData = [];

            if (isset($input['title'])) {
                $updateData['title'] = $input['title'];
            }

            if (isset($input['body'])) {
                $updateData['body'] = $input['body'];
            }

            if (array_key_exists('url', $input)) {
                $updateData['url'] = $input['url'];
            }

            if (isset($input['audienceType'])) {
                $updateData['audience_type'] = $input['audienceType'];

                // Explicitly clear event ID when switching back to 'all'
                $updateData['audience_event_id'] = $input['audienceType'] === 'event'
                    ? ($input['audienceEventId'] ?? null)
                    : null;
            } elseif (isset($input['audienceEventId'])) {
                // Allow updating event ID independently (only meaningful when type is 'event')
                $updateData['audience_event_id'] = $input['audienceEventId'];
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
     * DELETE /push-notifications/:id
     * Soft-delete a draft campaign (only when status = draft).
     */
    public function delete($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $notification = $this->model->find($id);

        if (!$notification) {
            return $this->failNotFound();
        }

        if ($notification->status !== PushNotificationEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('PushNotifications.onlyDraftDeletable'));
        }

        try {
            // Remove the icon directory if it exists
            $uploadDir = FCPATH . 'attachments/push-notifications/' . $id;

            if (is_dir($uploadDir)) {
                foreach (glob($uploadDir . '/*') as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }

                rmdir($uploadDir);
            }

            $this->model->delete($id);

            return $this->respondDeleted(['id' => $id]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /push-notifications/:id/upload
     * Upload an icon image for a campaign.
     */
    public function upload($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $notification = $this->model->find($id);

        if (!$notification) {
            return $this->failNotFound();
        }

        $file = $this->request->getFile('image');

        if (!$file || !$file->isValid()) {
            return $this->failValidationErrors(lang('General.fileUploadFailed'));
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return $this->failValidationErrors(lang('General.invalidFileType'));
        }

        try {
            $uploadDir = FCPATH . 'attachments/push-notifications/' . $id . '/';

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $newName = $file->getRandomName();
            $file->move($uploadDir, $newName, true);

            $iconPath = 'attachments/push-notifications/' . $id . '/' . $newName;

            $this->model->update($id, ['icon' => $iconPath]);

            return $this->respond([
                'icon' => '/' . $iconPath,
            ]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * GET /push-notifications/audiences
     * Returns the list of available audience options for a campaign.
     *
     * Items include an "all users" option (push subscribers count) and one
     * entry per event that has at least one registered user with a push
     * subscription.
     */
    public function audiences(): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        try {
            $usersModel      = new UsersModel();
            $subscriberCount = count($usersModel->getPushSubscribers());

            $items = [
                [
                    'type'    => 'all',
                    'eventId' => null,
                    'labelRu' => 'Все пользователи',
                    'labelEn' => 'All Users',
                    'count'   => $subscriberCount,
                ],
            ];

            $eventsUsersModel = new EventsUsersModel();
            $eventRows        = $eventsUsersModel->getPushAudienceEvents();

            foreach ($eventRows as $row) {
                $items[] = [
                    'type'    => 'event',
                    'eventId' => $row['event_id'],
                    'labelRu' => $row['title_ru'] ?? $row['title_en'] ?? '',
                    'labelEn' => $row['title_en'] ?? $row['title_ru'] ?? '',
                    'count'   => (int) $row['user_count'],
                ];
            }

            return $this->respond(['items' => $items]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }

    /**
     * POST /push-notifications/:id/test
     * Sends the notification immediately to the requesting admin's own
     * subscribed devices (synchronous, no queue).
     */
    public function test($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $notification = $this->model->find($id);

        if (!$notification) {
            return $this->failNotFound();
        }

        $subscriptionsModel = new PushSubscriptionsModel();
        $subscriptions      = $subscriptionsModel->findByUser($this->session->user->id);

        if (empty($subscriptions)) {
            return $this->failValidationErrors(['general' => lang('PushNotifications.noAdminSubscription')]);
        }

        $payload = [
            'title' => '[TEST] ' . $notification->title,
            'body'  => $notification->body,
            'icon'  => $notification->getIconUrl(),
            'url'   => $notification->url,
        ];

        $webPushLibrary = new WebPushLibrary();
        $sent           = 0;
        $failed         = 0;

        foreach ($subscriptions as $subscription) {
            try {
                $webPushLibrary->send($subscription, $payload);
                $sent++;
            } catch (WebPushExpiredSubscriptionException $e) {
                $subscriptionsModel->delete($subscription->id);
                $failed++;
            } catch (Exception $e) {
                log_message('error', '{exception}', ['exception' => $e]);
                $failed++;
            }
        }

        return $this->respond([
            'success' => $failed === 0,
            'sent'    => $sent,
            'failed'  => $failed,
        ]);
    }

    /**
     * POST /push-notifications/:id/send
     * Launch a campaign: enqueue one delivery row per subscription in the
     * chosen audience (only when status = draft).
     */
    public function send($id = null): ResponseInterface
    {
        if (!$this->session->isAuth) {
            return $this->failUnauthorized(lang('App.accessDenied'));
        }

        if (!$this->session->can(Permission::PUSH_MANAGE)) {
            return $this->failForbidden(lang('App.accessDenied'));
        }

        $notification = $this->model->find($id);

        if (!$notification) {
            return $this->failNotFound();
        }

        if ($notification->status !== PushNotificationEntity::STATUS_DRAFT) {
            return $this->failForbidden(lang('PushNotifications.onlyDraftLaunchable'));
        }

        try {
            $usersModel = new UsersModel();

            $audienceType = $notification->audience_type ?? 'all';

            if ($audienceType === 'event' && !empty($notification->audience_event_id)) {
                $eventsUsersModel = new EventsUsersModel();
                $users            = $eventsUsersModel->getPushRecipientsByEventId($notification->audience_event_id);
            } else {
                $users = $usersModel->getPushSubscribers();
            }

            $subscriptionsModel = new PushSubscriptionsModel();
            $deliveriesModel    = new PushNotificationDeliveriesModel();
            $insertBatch        = [];

            $now = date('Y-m-d H:i:s');

            foreach ($users as $user) {
                $subscriptions = $subscriptionsModel->findByUser($user['id']);

                foreach ($subscriptions as $subscription) {
                    $insertBatch[] = [
                        'id'              => uniqid(),  // generateId callback does not run on insertBatch
                        'notification_id' => $id,
                        'subscription_id' => $subscription->id,
                        'user_id'         => $user['id'],
                        'status'          => 'queued',
                        'created_at'      => $now,
                        'updated_at'      => $now,
                    ];
                }
            }

            $count = count($insertBatch);

            // Wrap the chunked enqueue and the status flip in a single
            // transaction: without it, a failure partway through the
            // chunk loop would leave earlier chunks committed but the
            // campaign still at status = 'draft', so the launch guard
            // above would let the admin re-send and duplicate every
            // already-queued delivery.
            $db = Database::connect();
            $db->transStart();

            if ($count > 0) {
                // Insert in chunks to avoid overly large queries
                foreach (array_chunk($insertBatch, 200) as $chunk) {
                    $deliveriesModel->insertBatch($chunk);
                }
            }

            $this->model->update($id, [
                'status'      => PushNotificationEntity::STATUS_SENDING,
                'total_count' => $count,
                'sent_at'     => Time::now()->toDateTimeString(),
            ]);

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError(lang('General.serverError'));
            }

            return $this->respond(['queued' => $count]);
        } catch (Exception $e) {
            log_message('error', '{exception}', ['exception' => $e]);

            return $this->failServerError(lang('General.serverError'));
        }
    }
}
