<?php
/**
 * Uninstall script - runs when plugin is deleted.
 *
 * @package Masquinator
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('masquinator_settings');

global $wpdb;
$wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
        '_transient_masquinator_%',
        '_transient_timeout_masquinator_%'
    )
);

wp_cache_flush();
