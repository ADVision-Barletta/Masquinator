<?php
declare(strict_types=1);

namespace Masquinator\Admin;

defined('ABSPATH') || exit;

class Importer {

    public function init(): void {
        add_action('admin_menu', [$this, 'add_admin_page'], 20);
        add_action('admin_post_mq_import_csv', [$this, 'handle_import']);
    }

    public function add_admin_page(): void {
        add_submenu_page(
            'edit.php?post_type=mq_menu_item',
            __('Importa da CSV', 'masquinator'),
            __('Importa CSV', 'masquinator'),
            'manage_options',
            'mq-import-csv',
            [$this, 'render_page']
        );
    }

    public function render_page(): void {
        if (!current_user_can('manage_options')) return;

        $csv_url = '';
        $options = get_option('masquinator_settings', []);
        if (!empty($options['csv_url'])) {
            $csv_url = $options['csv_url'];
        }

        $existing = wp_count_posts('mq_menu_item');
        $count = ($existing->publish ?? 0) + ($existing->draft ?? 0);
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Importa Menu da CSV', 'masquinator'); ?></h1>

            <?php if (isset($_GET['imported'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php echo esc_html(sprintf(
                        __('Importazione completata: %d piatti importati.', 'masquinator'),
                        intval($_GET['imported'])
                    )); ?></p>
                </div>
            <?php endif; ?>
            <?php if (isset($_GET['error'])): ?>
                <div class="notice notice-error is-dismissible">
                    <p><?php echo esc_html($_GET['error']); ?></p>
                </div>
            <?php endif; ?>

            <p><?php esc_html_e('Importa i piatti dal Google Sheets CSV nel Custom Post Type. ATTENZIONE: tutti i piatti esistenti verranno eliminati e sostituiti.', 'masquinator'); ?></p>

            <p><strong><?php esc_html_e('URL CSV configurato:', 'masquinator'); ?></strong><br>
            <code><?php echo esc_html($csv_url ?: __('Nessun URL configurato', 'masquinator')); ?></code></p>

            <p><strong><?php esc_html_e('Piatti già presenti:', 'masquinator'); ?></strong> <?php echo intval($count); ?></p>

            <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post">
                <?php wp_nonce_field('mq_import_csv', 'mq_import_nonce'); ?>
                <input type="hidden" name="action" value="mq_import_csv">
                <input type="hidden" name="csv_url" value="<?php echo esc_attr($csv_url); ?>">
                <?php submit_button(__('Importa da CSV', 'masquinator'), 'primary'); ?>
            </form>
        </div>
        <?php
    }

    public function handle_import(): void {
        if (!current_user_can('manage_options')) wp_die('Nope');
        check_admin_referer('mq_import_csv', 'mq_import_nonce');

        $csv_url = isset($_POST['csv_url']) ? esc_url_raw(wp_unslash($_POST['csv_url'])) : '';
        if (!$csv_url) {
            wp_redirect(add_query_arg('error', urlencode('Nessun URL CSV configurato.'), admin_url('edit.php?post_type=mq_menu_item&page=mq-import-csv')));
            exit;
        }

        $response = wp_remote_get($csv_url, ['timeout' => 30]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            wp_redirect(add_query_arg('error', urlencode('Impossibile scaricare il CSV.'), admin_url('edit.php?post_type=mq_menu_item&page=mq-import-csv')));
            exit;
        }

        $csv = wp_remote_retrieve_body($response);
        $lines = explode("\n", $csv);
        if (count($lines) < 2) {
            wp_redirect(add_query_arg('error', urlencode('CSV vuoto o non valido.'), admin_url('edit.php?post_type=mq_menu_item&page=mq-import-csv')));
            exit;
        }

        $headers = $this->parse_csv_line($lines[0]);
        $norm = array_map([$this, 'normalize_header'], $headers);

        $existing = get_posts([
            'post_type' => 'mq_menu_item',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids',
        ]);
        foreach ($existing as $id) {
            wp_delete_post($id, true);
        }

        $imported = 0;

        for ($i = 1; $i < count($lines); $i++) {
            if (!trim($lines[$i])) continue;
            $row = $this->parse_csv_line($lines[$i]);
            $item = $this->map_item($norm, $row);

            if (empty($item['titolo']) || empty($item['categoria'])) continue;

            $post_id = wp_insert_post([
                'post_title'   => $item['titolo'],
                'post_content' => $item['descrizione'] ?? '',
                'post_status'  => 'publish',
                'post_type'    => 'mq_menu_item',
            ]);

            if (!$post_id || is_wp_error($post_id)) continue;
            $imported++;

            if (!empty($item['categoria'])) update_post_meta($post_id, '_mq_categoria', strtolower($item['categoria']));
            if (!empty($item['sezione']))   update_post_meta($post_id, '_mq_sezione', $item['sezione']);
            if (!empty($item['prezzo']))    update_post_meta($post_id, '_mq_prezzo', $item['prezzo']);
            if (!empty($item['tag']))       update_post_meta($post_id, '_mq_tag', $item['tag']);
        }

        $redirect = add_query_arg([
            'imported' => $imported,
        ], admin_url('edit.php?post_type=mq_menu_item&page=mq-import-csv'));

        wp_redirect($redirect);
        exit;
    }

    private function parse_csv_line(string $line): array {
        $q = false;
        $field = '';
        $fields = [];
        for ($i = 0; $i < strlen($line); $i++) {
            $c = $line[$i];
            if ($c === '"') { $q = !$q; }
            elseif ($c === ',' && !$q) { $fields[] = $field; $field = ''; }
            else { $field .= $c; }
        }
        $fields[] = $field;
        return $fields;
    }

    private function normalize_header(string $h): string {
        $h = trim(strtolower($h));
        if ($h === 'id') return 'id';
        if (str_contains($h, 'categoria')) return 'categoria';
        if (str_contains($h, 'sezione')) return 'sezione';
        if (str_contains($h, 'titolo')) return 'titolo';
        if (str_contains($h, 'prezzo')) return 'prezzo';
        if (str_contains($h, 'descriz') || str_contains($h, 'ingredient')) return 'descrizione';
        if (str_contains($h, 'tag')) return 'tag';
        return $h;
    }

    private function map_item(array $headers, array $values): array {
        $item = [];
        foreach ($headers as $i => $key) {
            $val = isset($values[$i]) ? trim($values[$i]) : '';
            $item[$key] = $val;
        }
        if (!empty($item['tag'])) {
            $item['tag'] = implode(',', array_map('trim', explode(',', $item['tag'])));
        }
        return $item;
    }
}
