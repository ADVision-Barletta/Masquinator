<?php
declare(strict_types=1);

namespace Masquinator\Admin;

defined('ABSPATH') || exit;

use Masquinator\MASQUINATOR_PATH;
use Masquinator\MASQUINATOR_URL;

class Settings {

    private const OPTION_GROUP = 'masquinator_settings';
    private const OPTION_NAME = 'masquinator_settings';
    private const PAGE_SLUG = 'masquinator-settings';

    public function init(): void {
        add_action('admin_menu', [$this, 'add_menu_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function add_menu_page(): void {
        add_options_page(
            __('Masquinator', 'masquinator'),
            __('Masquinator', 'masquinator'),
            'manage_options',
            self::PAGE_SLUG,
            [$this, 'render_settings_page']
        );
    }

    public function register_settings(): void {
        register_setting(
            self::OPTION_GROUP,
            self::OPTION_NAME,
            [
                'type'              => 'array',
                'sanitize_callback' => [$this, 'sanitize_settings'],
                'default'           => $this->get_defaults(),
            ]
        );

        add_settings_section(
            'masquinator_general',
            __('Impostazioni Generali', 'masquinator'),
            [$this, 'render_general_section'],
            self::PAGE_SLUG
        );

        add_settings_section(
            'masquinator_data',
            __('Fonte Dati', 'masquinator'),
            [$this, 'render_data_section'],
            self::PAGE_SLUG
        );

        $this->add_fields();
    }

    private function add_fields(): void {
        add_settings_field(
            'enabled',
            __('Abilita Widget', 'masquinator'),
            [$this, 'render_checkbox_field'],
            self::PAGE_SLUG,
            'masquinator_general',
            [
                'label_for'   => 'enabled',
                'description' => __('Abilita o disabilita il widget Masquinator.', 'masquinator'),
            ]
        );

        add_settings_field(
            'data_source',
            __('Fonte Dati Menu', 'masquinator'),
            [$this, 'render_select_field'],
            self::PAGE_SLUG,
            'masquinator_data',
            [
                'label_for'   => 'data_source',
                'options'     => [
                    'csv' => __('Google Sheets CSV', 'masquinator'),
                    'cpt' => __('Custom Post Type WordPress', 'masquinator'),
                ],
                'description' => __('Scegli dove leggere i dati del menu.', 'masquinator'),
            ]
        );

        add_settings_field(
            'csv_url',
            __('URL Google Sheets CSV', 'masquinator'),
            [$this, 'render_text_field'],
            self::PAGE_SLUG,
            'masquinator_data',
            [
                'label_for'   => 'csv_url',
                'type'        => 'url',
                'description' => __('URL pubblicato del Google Sheet in formato CSV.', 'masquinator'),
            ]
        );
    }

    private function get_defaults(): array {
        return [
            'csv_url' => 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWqaQeX4ndFLfpY8o8HXMdu7-g0-H5uJW7gKj6xN_EXtNs1tuCXLo3vz_qy2eUXvJZQUDEVg0-Qqb2/pub?output=csv',
            'data_source' => 'csv',
            'enabled' => true,
        ];
    }

    public function sanitize_settings(array $input): array {
        $sanitized = [];
        $sanitized['enabled'] = !empty($input['enabled']);
        $sanitized['data_source'] = in_array($input['data_source'] ?? '', ['csv', 'cpt'], true) ? $input['data_source'] : 'csv';
        $sanitized['csv_url'] = esc_url_raw(wp_unslash($input['csv_url'] ?? ''));
        return $sanitized;
    }

    public function render_settings_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        if (isset($_GET['settings-updated'])) {
            add_settings_error(
                self::OPTION_GROUP,
                'settings_updated',
                __('Impostazioni salvate.', 'masquinator'),
                'updated'
            );
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <?php settings_errors(self::OPTION_GROUP); ?>

            <form action="options.php" method="post">
                <?php
                settings_fields(self::OPTION_GROUP);
                do_settings_sections(self::PAGE_SLUG);
                submit_button(__('Salva Impostazioni', 'masquinator'));
                ?>
            </form>

            <hr>
            <h2><?php esc_html_e('Shortcode', 'masquinator'); ?></h2>
            <p><?php esc_html_e('Usa questo shortcode per inserire il widget nelle pagine:', 'masquinator'); ?></p>
            <code>[masquinator]</code>

            <h2><?php esc_html_e('Gutenberg Block', 'masquinator'); ?></h2>
            <p><?php esc_html_e('Nel block editor, cerca "Masquinator" e inserisci il blocco "Masque Matchmaker".', 'masquinator'); ?></p>
        </div>
        <?php
    }

    public function render_general_section(): void {
        echo '<p>' . esc_html__('Configura le impostazioni generali di Masquinator.', 'masquinator') . '</p>';
    }

    public function render_data_section(): void {
        echo '<p>' . esc_html__('Configura la fonte dei dati del menu.', 'masquinator') . '</p>';
    }

    public function render_checkbox_field(array $args): void {
        $options = get_option(self::OPTION_NAME, $this->get_defaults());
        $value = $options[$args['label_for']] ?? false;
        ?>
        <input type="checkbox"
               id="<?php echo esc_attr($args['label_for']); ?>"
               name="<?php echo esc_attr(self::OPTION_NAME . '[' . $args['label_for'] . ']'); ?>"
               value="1"
               <?php checked($value, true); ?> />
        <?php if (!empty($args['description'])): ?>
            <p class="description"><?php echo esc_html($args['description']); ?></p>
        <?php endif;
    }

    public function render_text_field(array $args): void {
        $options = get_option(self::OPTION_NAME, $this->get_defaults());
        $value = $options[$args['label_for']] ?? '';
        $type = $args['type'] ?? 'text';
        ?>
        <input type="<?php echo esc_attr($type); ?>"
               id="<?php echo esc_attr($args['label_for']); ?>"
               name="<?php echo esc_attr(self::OPTION_NAME . '[' . $args['label_for'] . ']'); ?>"
               value="<?php echo esc_attr(esc_url($value)); ?>"
               class="regular-text" />
        <?php if (!empty($args['description'])): ?>
            <p class="description"><?php echo esc_html($args['description']); ?></p>
        <?php endif;
    }

    public function render_select_field(array $args): void {
        $options = get_option(self::OPTION_NAME, $this->get_defaults());
        $value = $options[$args['label_for']] ?? '';
        ?>
        <select id="<?php echo esc_attr($args['label_for']); ?>"
                name="<?php echo esc_attr(self::OPTION_NAME . '[' . $args['label_for'] . ']'); ?>">
            <?php foreach ($args['options'] as $key => $label): ?>
                <option value="<?php echo esc_attr($key); ?>" <?php selected($value, $key); ?>>
                    <?php echo esc_html($label); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <?php if (!empty($args['description'])): ?>
            <p class="description"><?php echo esc_html($args['description']); ?></p>
        <?php endif;
    }

    public function enqueue_admin_assets(string $hook): void {
        if ($hook !== 'settings_page_' . self::PAGE_SLUG) {
            return;
        }
    }
}
