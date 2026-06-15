<?php
declare(strict_types=1);

namespace Masquinator;

defined('ABSPATH') || exit;

class Activator {

    public static function activate(): void {
        self::check_requirements();
        self::set_default_options();
        flush_rewrite_rules();
    }

    private static function check_requirements(): void {
        if (version_compare(PHP_VERSION, '8.1', '<')) {
            deactivate_plugins(MASQUINATOR_BASENAME);
            wp_die(
                esc_html__('Masquinator richiede PHP 8.1 o superiore.', 'masquinator'),
                'Plugin Activation Error',
                ['back_link' => true]
            );
        }

        global $wp_version;
        if (version_compare($wp_version, '6.4', '<')) {
            deactivate_plugins(MASQUINATOR_BASENAME);
            wp_die(
                esc_html__('Masquinator richiede WordPress 6.4 o superiore.', 'masquinator'),
                'Plugin Activation Error',
                ['back_link' => true]
            );
        }
    }

    private static function set_default_options(): void {
        $defaults = [
            'csv_url' => 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWqaQeX4ndFLfpY8o8HXMdu7-g0-H5uJW7gKj6xN_EXtNs1tuCXLo3vz_qy2eUXvJZQUDEVg0-Qqb2/pub?output=csv',
            'data_source' => 'csv',
            'enabled' => true,
        ];

        if (get_option('masquinator_settings') === false) {
            add_option('masquinator_settings', $defaults);
        }
    }
}
