<?php
/**
 * Plugin Name:       Masquinator
 * Plugin URI:        https://github.com/Masquinator
 * Description:       Il Genio del Masque — Widget interattivo per raccomandazioni menu ristorante. Rispondi a 6 domande e scopri la cena perfetta.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Masquinator
 * Author URI:        https://github.com/Masquinator
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       masquinator
 * Domain Path:       /languages
 *
 * @package Masquinator
 */

declare(strict_types=1);

namespace Masquinator;

defined('ABSPATH') || exit;

define('MASQUINATOR_VERSION', '1.0.0');
define('MASQUINATOR_FILE', __FILE__);
define('MASQUINATOR_PATH', plugin_dir_path(__FILE__));
define('MASQUINATOR_URL', plugin_dir_url(__FILE__));
define('MASQUINATOR_BASENAME', plugin_basename(__FILE__));

require_once MASQUINATOR_PATH . 'includes/class-activator.php';
require_once MASQUINATOR_PATH . 'includes/class-deactivator.php';
require_once MASQUINATOR_PATH . 'includes/class-settings.php';
require_once MASQUINATOR_PATH . 'includes/class-shortcode.php';

function activate(): void {
    Activator::activate();
}
register_activation_hook(__FILE__, __NAMESPACE__ . '\\activate');

function deactivate(): void {
    Deactivator::deactivate();
}
register_deactivation_hook(__FILE__, __NAMESPACE__ . '\\deactivate');

function init(): void {
    $settings = new Admin\Settings();
    $settings->init();

    $shortcode = new Frontend\Shortcode();
    $shortcode->init();
}
add_action('plugins_loaded', __NAMESPACE__ . '\\init');

function enqueue_assets(): void {
    wp_enqueue_style(
        'masquinator-style',
        MASQUINATOR_URL . 'public/css/masquinator.css',
        [],
        MASQUINATOR_VERSION
    );

    wp_enqueue_script(
        'masquinator-theme',
        MASQUINATOR_URL . 'assets/theme.js',
        [],
        MASQUINATOR_VERSION,
        true
    );

    wp_enqueue_script(
        'masquinator-script',
        MASQUINATOR_URL . 'public/js/masquinator.js',
        [],
        MASQUINATOR_VERSION,
        true
    );

    $options = get_option('masquinator_settings', []);
    wp_localize_script('masquinator-script', 'MasquinatorConfig', [
        'csvUrl' => $options['csv_url'] ?? '',
        'cptEnabled' => ($options['data_source'] ?? 'csv') === 'cpt',
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('masquinator_ajax_nonce'),
    ]);
}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_assets');

function register_block(): void {
    if (!function_exists('register_block_type')) {
        return;
    }

    $block_json_path = MASQUINATOR_PATH . 'blocks/masquinator-block/block.json';
    if (file_exists($block_json_path)) {
        register_block_type('masquinator/widget', [
            'render_callback' => function ($attributes) {
                $shortcode = new Frontend\Shortcode();
                return $shortcode->render($attributes);
            },
        ]);
    }
}
add_action('init', __NAMESPACE__ . '\\register_block');
