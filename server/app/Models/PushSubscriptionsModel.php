<?php

namespace App\Models;

use App\Entities\PushSubscriptionEntity;

/**
 * PushSubscriptionsModel
 *
 * Manages the `push_subscriptions` table — one row per browser/device a user
 * has opted into Web Push on. `endpoint` is unique; re-subscribing the same
 * browser/device with an unchanged endpoint updates the existing row instead
 * of creating a duplicate. A re-subscribe *can* get a brand new endpoint
 * (the Push API issues a new one whenever a prior subscription was
 * invalidated, e.g. the service worker was unregistered) — in that case an
 * authenticated upsert also replaces any of that same user's other rows
 * sharing the same user_agent, rather than accumulating a stale duplicate.
 * See upsertByEndpoint().
 */
class PushSubscriptionsModel extends ApplicationBaseModel
{
    protected $table            = 'push_subscriptions';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = PushSubscriptionEntity::class;
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'user_id',
        'endpoint',
        'p256dh',
        'auth_key',
        'user_agent',
    ];

    // Dates
    protected $useTimestamps = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Creates or refreshes a subscription row for the given endpoint.
     *
     * Looks the row up by its unique `endpoint` first: if found, the keys,
     * user agent, and owning user are refreshed in place (a browser can
     * resubscribe the same endpoint after clearing storage, or the keys can
     * rotate) rather than creating a duplicate row. Otherwise a new row is
     * inserted.
     *
     * $userId is nullable — a guest visitor (no session yet) can create a
     * subscription too (see PushSubscriptions::subscribe()), and it's
     * claimed later by re-calling this once they log in. An anonymous
     * ($userId === null) call never downgrades a row some user already
     * claimed back to anonymous — it only fills in ownership, never erases
     * it — so stale unauthenticated state (e.g. a leftover browser tab
     * after logout) can't silently unlink someone else's subscription. An
     * authenticated call always wins and re-claims the row to that user,
     * even if it belonged to someone else (a shared device's current owner
     * is whoever is logged in on it now).
     *
     * @param string|null $userId    Owning user's id, or null for an anonymous/guest subscription.
     * @param string      $endpoint  Push service endpoint URL (unique).
     * @param array       $keys      ['p256dh' => ..., 'auth' => ...]
     * @param string|null $userAgent Optional browser user agent string.
     * @return PushSubscriptionEntity The current (inserted or updated) row.
     */
    public function upsertByEndpoint(?string $userId, string $endpoint, array $keys, ?string $userAgent): PushSubscriptionEntity
    {
        $existing = $this->where('endpoint', $endpoint)->first();

        $data = [
            'user_id'    => $userId ?? $existing?->user_id,
            'endpoint'   => $endpoint,
            'p256dh'     => $keys['p256dh'],
            'auth_key'   => $keys['auth'],
            'user_agent' => $userAgent,
        ];

        if ($existing) {
            $this->update($existing->id, $data);

            return $this->find($existing->id);
        }

        // A genuinely new endpoint for an already-authenticated user, sharing
        // the exact same user_agent as one of their other rows, is almost
        // always the same physical browser re-subscribing after its previous
        // Push API subscription was invalidated out-of-band - e.g. DevTools
        // "Unregister" on the service worker, clearing site data, or a
        // browser profile reset. None of those call unsubscribe(), so the
        // stale row would otherwise linger forever: the self-cleaning
        // 404/410 path in SendPushNotifications only prunes a row the next
        // time a real campaign happens to target it, which for a low-volume
        // mailing list can be months away. Replace it instead of
        // accumulating a duplicate. Scoped to $userId - never applied to an
        // anonymous insert, where a shared user_agent string says nothing
        // about "same device" (it's common to millions of unrelated
        // visitors) and would risk deleting a stranger's subscription.
        if ($userId !== null && $userAgent !== null) {
            $this->where('user_id', $userId)->where('user_agent', $userAgent)->delete();
        }

        $entity = new PushSubscriptionEntity($data);
        $this->save($entity);

        return $this->find($this->getInsertID());
    }

    /**
     * Returns every subscription row belonging to a user (one per
     * browser/device they've opted in on).
     *
     * @return PushSubscriptionEntity[]
     */
    public function findByUser(string $userId): array
    {
        return $this->where('user_id', $userId)->findAll();
    }

    /**
     * Deletes a subscription by its (owning user, endpoint) pair. Hard
     * delete — this table has no soft-deletes, an unsubscribed endpoint
     * carries no audit value. Scoped to $userId so one user can never
     * unsubscribe another user's endpoint.
     */
    public function deleteByUserAndEndpoint(string $userId, string $endpoint): bool
    {
        return $this->where('user_id', $userId)->where('endpoint', $endpoint)->delete();
    }
}
