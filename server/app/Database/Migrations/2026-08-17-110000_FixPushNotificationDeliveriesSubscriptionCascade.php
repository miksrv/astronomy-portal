<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * push_notification_deliveries.subscription_id previously had an
 * ON DELETE CASCADE FK to push_subscriptions. SendPushNotifications hard-
 * deletes a subscription the moment it reports HTTP 404/410
 * (WebPushExpiredSubscriptionException), and that CASCADE silently erased
 * the delivery row right along with it — even though the command had just
 * marked it 'rejected' one line earlier. That defeated the delivery table's
 * purpose as a permanent send-audit log (it mirrors mailing_emails, which
 * survives an unsubscribe just fine) and made
 * PushNotificationsModel::updateCounts() undercount error_count, since the
 * 'rejected' row it would have counted no longer existed.
 *
 * Switches the FK to SET NULL — matching how user_id already behaves on
 * this same table — and makes subscription_id nullable so a delivery row
 * can outlive the subscription it targeted.
 */
class FixPushNotificationDeliveriesSubscriptionCascade extends Migration
{
    private const FK_NAME = 'fk_push_notification_deliveries_subscription';

    public function up()
    {
        $this->forge->dropForeignKey('push_notification_deliveries', 'push_notification_deliveries_subscription_id_foreign');

        $this->forge->modifyColumn('push_notification_deliveries', [
            'subscription_id' => [
                'name'       => 'subscription_id',
                'type'       => 'VARCHAR',
                'constraint' => 24,
                'null'       => true,
            ],
        ]);

        // addForeignKey($field, $refTable, $refField, $onUpdate, $onDelete, $fkName) —
        // onUpdate stays CASCADE (matches every other FK here); only
        // onDelete changes, CASCADE -> SET NULL.
        $this->forge->addForeignKey('subscription_id', 'push_subscriptions', 'id', 'CASCADE', 'SET NULL', self::FK_NAME);
        $this->forge->processIndexes('push_notification_deliveries');
    }

    public function down()
    {
        $this->forge->dropForeignKey('push_notification_deliveries', self::FK_NAME);

        // Deliveries left with a NULL subscription_id (subscriptions cleaned
        // up while this migration was active) can't survive reverting the
        // column back to NOT NULL — drop them first.
        $this->db->table('push_notification_deliveries')->where('subscription_id', null)->delete();

        $this->forge->modifyColumn('push_notification_deliveries', [
            'subscription_id' => [
                'name'       => 'subscription_id',
                'type'       => 'VARCHAR',
                'constraint' => 24,
                'null'       => false,
            ],
        ]);

        $this->forge->addForeignKey('subscription_id', 'push_subscriptions', 'id', 'CASCADE', 'CASCADE');
        $this->forge->processIndexes('push_notification_deliveries');
    }
}
