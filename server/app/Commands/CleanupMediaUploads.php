<?php

/**
 * Cron command to purge abandoned chunked event-media (photo/video) upload
 * sessions (FEAT-26).
 *
 * A user who starts a chunked upload and never finishes it (closes the tab,
 * network dies for good) leaves an `events_media_uploads` row stuck in
 * 'uploading'/'finalizing' plus its temp chunk directory on disk forever -
 * a deliberate Events::mediaCancel() call already cleans both up
 * immediately, this command exists only to catch the sessions that never
 * got that explicit cancel.
 *
 * Run manually:
 *   php spark media:cleanup-uploads
 *
 * Add to cron (runs every minute, alongside system:send-email/send-push -
 * cheap no-op when there is nothing stale):
 *   * * * * * cd /path/to/server && php spark media:cleanup-uploads >> /dev/null 2>&1
 */

namespace App\Commands;

use App\Models\EventsMediaUploadsModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use Exception;

class CleanupMediaUploads extends BaseCommand
{
    protected $group       = 'system';
    protected $name        = 'media:cleanup-uploads';
    protected $description = 'Purges abandoned chunked event-media upload sessions (and their temp chunk directories) older than 24 hours';

    private const STALE_AFTER_HOURS = 24;

    public function run(array $params)
    {
        $uploadsModel  = new EventsMediaUploadsModel();
        $staleSessions = $uploadsModel->getStaleSessions(self::STALE_AFTER_HOURS);

        if (empty($staleSessions)) {
            CLI::write('No stale media upload sessions to clean up.', 'yellow');
            return;
        }

        $removedCount = 0;
        $errorCount   = 0;

        foreach ($staleSessions as $session) {
            try {
                $this->removeDirectory(UPLOAD_EVENTS . $session->event_id . '/tmp/' . $session->id . '/');

                // Also take away the shared per-event tmp/ parent once it's
                // empty — rmdir() refuses a non-empty directory, so a still-
                // active session's chunks keep it alive.
                @rmdir(UPLOAD_EVENTS . $session->event_id . '/tmp');

                // Hard delete — events_media_uploads has no soft-deletes,
                // an abandoned session carries no audit value once purged.
                $uploadsModel->delete($session->id);

                $removedCount++;
            } catch (Exception $e) {
                log_message('error', 'CleanupMediaUploads error for session ID ' . $session->id . ': {exception}', ['exception' => $e]);

                $errorCount++;
            }
        }

        CLI::write('Media upload cleanup complete.', 'green');
        CLI::write('  Removed: ' . $removedCount, 'green');
        CLI::write('  Errors:  ' . $errorCount, $errorCount > 0 ? 'red' : 'green');
    }

    /**
     * Recursively deletes a temp chunk directory and everything in it.
     * Duplicated from Events::removeDirectory() rather than shared through a
     * library, since a CLI command has no controller instance to call into
     * and the logic itself is a few lines of plain filesystem recursion.
     */
    private function removeDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        foreach (glob(rtrim($dir, '/') . '/*') ?: [] as $path) {
            is_dir($path) ? $this->removeDirectory($path . '/') : @unlink($path);
        }

        @rmdir($dir);
    }
}
