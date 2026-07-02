<?php

namespace App\Models;

use CodeIgniter\I18n\Time;
use Config\MagicLink;

/**
 * MagicLinkTokensModel
 *
 * Single-use tokens for passwordless email login. Only the SHA-256 hash of a
 * token is ever persisted — the raw value exists only in the emailed link.
 * Rows also serve as the rate-limit ledger for the request endpoint, so no
 * separate throttling table is needed.
 */
class MagicLinkTokensModel extends ApplicationBaseModel
{
    protected $table            = 'magic_link_tokens';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;

    protected $allowedFields = [
        'email',
        'user_id',
        'token_hash',
        'return_path',
        'ip_address',
        'expires_at',
        'used_at',
    ];

    protected $useTimestamps = false;

    protected $allowCallbacks = true;
    protected $beforeInsert   = ['generateId'];

    /**
     * Creates a new login token for the given email, invalidating any of the
     * email's previous unused tokens first. Returns the raw token — the only
     * place it ever exists in plaintext, meant to be embedded in the emailed
     * link and never stored.
     *
     * @param string      $email      Recipient address (will be lowercased/trimmed).
     * @param string|null $returnPath Validated relative path to return to after login.
     * @param string|null $ip         Requesting IP, used for rate-limiting.
     * @return string The raw (unhashed) token.
     */
    public function createToken(string $email, ?string $returnPath, ?string $ip): string
    {
        $email = strtolower(trim($email));

        $this->where('email', $email)->where('used_at', null)->delete();

        $existingUser = (new UsersModel())->findUserByEmailAddress($email);

        $rawToken = bin2hex(random_bytes(32));

        $this->insert([
            'email'       => $email,
            'user_id'     => $existingUser?->id,
            'token_hash'  => hash('sha256', $rawToken),
            'return_path' => $returnPath,
            'ip_address'  => $ip,
            'expires_at'  => Time::now()->addMinutes(MagicLink::TOKEN_TTL_MINUTES)->toDateTimeString(),
        ]);

        return $rawToken;
    }

    /**
     * Atomically claims a token: marks it used only if it is currently unused
     * and not expired, in a single UPDATE, so a concurrent double-consume
     * (e.g. a real click racing a mail-scanner prefetch) can never both
     * succeed.
     *
     * @param string $rawToken The raw token from the emailed link.
     * @return array{email: string, return_path: string|null}|null The claimed
     *         row's email/return_path, or null if invalid/expired/already used.
     */
    public function consumeToken(string $rawToken): ?array
    {
        $tokenHash = hash('sha256', $rawToken);

        $this->builder()
            ->where('token_hash', $tokenHash)
            ->where('used_at', null)
            ->where('expires_at >', Time::now()->toDateTimeString())
            ->update(['used_at' => Time::now()->toDateTimeString()]);

        if ($this->db->affectedRows() !== 1) {
            return null;
        }

        return $this->select('email, return_path')->where('token_hash', $tokenHash)->first();
    }

    /**
     * Checks the per-email cooldown and per-IP burst cap against thresholds
     * in Config\MagicLink. Callers should silently no-op the send (while
     * still returning a generic success response) rather than surface this
     * to the client, to avoid leaking timing information.
     *
     * @param string      $email Recipient address.
     * @param string|null $ip    Requesting IP.
     * @return bool True if the request should be throttled.
     */
    public function isRateLimited(string $email, ?string $ip): bool
    {
        $lastForEmail = $this->select('created_at')
            ->where('email', strtolower(trim($email)))
            ->orderBy('created_at', 'DESC')
            ->first();

        if ($lastForEmail) {
            $cooldownEnd = Time::parse($lastForEmail['created_at'])->addSeconds(MagicLink::EMAIL_COOLDOWN_SECONDS);

            if ($cooldownEnd->isAfter(Time::now())) {
                return true;
            }
        }

        if ($ip) {
            $recentFromIp = $this->where('ip_address', $ip)
                ->where('created_at >', Time::now()->subMinutes(MagicLink::IP_WINDOW_MINUTES)->toDateTimeString())
                ->countAllResults();

            if ($recentFromIp >= MagicLink::IP_MAX_REQUESTS) {
                return true;
            }
        }

        return false;
    }
}
