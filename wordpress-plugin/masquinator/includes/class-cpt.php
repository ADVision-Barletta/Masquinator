<?php
declare(strict_types=1);

namespace Masquinator;

defined('ABSPATH') || exit;

class CPT {

    public function init(): void {
        add_action('init', [$this, 'register_post_type']);
        add_action('init', [$this, 'register_meta_fields']);
        add_action('add_meta_boxes', [$this, 'add_meta_box']);
        add_action('save_post_mq_menu_item', [$this, 'save_meta_box']);
        add_action('wp_ajax_mq_get_menu', [$this, 'ajax_get_menu']);
        add_action('wp_ajax_nopriv_mq_get_menu', [$this, 'ajax_get_menu']);

        add_filter('manage_mq_menu_item_posts_columns', [$this, 'admin_columns']);
        add_action('manage_mq_menu_item_posts_custom_column', [$this, 'admin_columns_content'], 10, 2);
        add_filter('manage_edit-mq_menu_item_sortable_columns', [$this, 'admin_sortable_columns']);
    }

    public function register_post_type(): void {
        register_post_type('mq_menu_item', [
            'labels' => [
                'name'               => __('Menu Masquinator', 'masquinator'),
                'singular_name'      => __('Piatto', 'masquinator'),
                'add_new'            => __('Aggiungi Piatto', 'masquinator'),
                'add_new_item'       => __('Aggiungi Nuovo Piatto', 'masquinator'),
                'edit_item'          => __('Modifica Piatto', 'masquinator'),
                'view_item'          => __('Vedi Piatto', 'masquinator'),
                'search_items'       => __('Cerca Piatti', 'masquinator'),
                'not_found'          => __('Nessun piatto trovato', 'masquinator'),
                'not_found_in_trash' => __('Nessun piatto nel cestino', 'masquinator'),
                'all_items'          => __('Tutti i Piatti', 'masquinator'),
                'menu_name'          => __('Menu Masquinator', 'masquinator'),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_menu' => true,
            'menu_icon'    => 'dashicons-food',
            'menu_position' => 25,
            'supports'     => ['title', 'editor'],
            'show_in_rest' => false,
            'capability_type' => 'post',
            'capabilities' => [
                'create_posts' => 'edit_posts',
            ],
            'map_meta_cap' => true,
        ]);
    }

    public function register_meta_fields(): void {
        $fields = ['_mq_categoria', '_mq_sezione', '_mq_prezzo', '_mq_tag'];
        foreach ($fields as $key) {
            register_post_meta('mq_menu_item', $key, [
                'type'          => 'string',
                'single'        => true,
                'show_in_rest'  => false,
                'auth_callback' => function () { return current_user_can('edit_posts'); },
            ]);
        }
    }

    public function add_meta_box(): void {
        add_meta_box(
            'mq_menu_data',
            __('Dati Menu', 'masquinator'),
            [$this, 'render_meta_box'],
            'mq_menu_item',
            'normal',
            'high'
        );
    }

    public function render_meta_box(\WP_Post $post): void {
        wp_nonce_field('mq_menu_meta_box', 'mq_menu_meta_nonce');
        $categoria = get_post_meta($post->ID, '_mq_categoria', true);
        $sezione   = get_post_meta($post->ID, '_mq_sezione', true);
        $prezzo    = get_post_meta($post->ID, '_mq_prezzo', true);
        $tag       = get_post_meta($post->ID, '_mq_tag', true);
        ?>
        <table class="form-table">
            <tr>
                <th><label for="mq_categoria"><?php esc_html_e('Categoria', 'masquinator'); ?></label></th>
                <td>
                    <select id="mq_categoria" name="mq_categoria" class="regular-text">
                        <option value="">— <?php esc_attr_e('Seleziona', 'masquinator'); ?> —</option>
                        <?php foreach (['salato', 'dolce', 'drink', 'analcolico'] as $cat): ?>
                            <option value="<?php echo esc_attr($cat); ?>" <?php selected($categoria, $cat); ?>>
                                <?php echo esc_html(ucfirst($cat)); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="mq_sezione"><?php esc_html_e('Sezione', 'masquinator'); ?></label></th>
                <td>
                    <input type="text" id="mq_sezione" name="mq_sezione"
                           value="<?php echo esc_attr($sezione); ?>" class="regular-text"
                           placeholder="<?php esc_attr_e('es. Antipasti, Vini Rossi, Cocktail...', 'masquinator'); ?>">
                </td>
            </tr>
            <tr>
                <th><label for="mq_prezzo"><?php esc_html_e('Prezzo', 'masquinator'); ?></label></th>
                <td>
                    <input type="text" id="mq_prezzo" name="mq_prezzo"
                           value="<?php echo esc_attr($prezzo); ?>" class="regular-text"
                           placeholder="<?php esc_attr_e('es. 12, 12.50, nd', 'masquinator'); ?>">
                </td>
            </tr>
            <tr>
                <th><label for="mq_tag"><?php esc_html_e('Tag', 'masquinator'); ?></label></th>
                <td>
                    <input type="text" id="mq_tag" name="mq_tag"
                           value="<?php echo esc_attr($tag); ?>" class="regular-text"
                           placeholder="<?php esc_attr_e('es. mare,leggero,delicato', 'masquinator'); ?>">
                    <p class="description"><?php esc_html_e('Separati da virgola. Usati dal Genio per consigliare i piatti.', 'masquinator'); ?></p>
                </td>
            </tr>
        </table>
        <p><em><?php esc_html_e('Il contenuto (descrizione) si inserisce nell\'editor qui sopra.', 'masquinator'); ?></em></p>
        <?php
    }

    public function save_meta_box(int $post_id): void {
        if (empty($_POST['mq_menu_meta_nonce']) || !wp_verify_nonce($_POST['mq_menu_meta_nonce'], 'mq_menu_meta_box')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        $fields = [
            'mq_categoria' => '_mq_categoria',
            'mq_sezione'   => '_mq_sezione',
            'mq_prezzo'    => '_mq_prezzo',
            'mq_tag'       => '_mq_tag',
        ];

        foreach ($fields as $input => $meta_key) {
            $value = isset($_POST[$input]) ? sanitize_text_field(wp_unslash($_POST[$input])) : '';
            if ($value) {
                update_post_meta($post_id, $meta_key, $value);
            } else {
                delete_post_meta($post_id, $meta_key);
            }
        }
    }

    public function admin_columns(array $columns): array {
        $new = [];
        foreach ($columns as $key => $label) {
            $new[$key] = $label;
            if ($key === 'title') {
                $new['mq_categoria'] = __('Categoria', 'masquinator');
                $new['mq_sezione']   = __('Sezione', 'masquinator');
                $new['mq_prezzo']    = __('Prezzo', 'masquinator');
            }
        }
        return $new;
    }

    public function admin_columns_content(string $column, int $post_id): void {
        switch ($column) {
            case 'mq_categoria':
                echo esc_html(ucfirst(get_post_meta($post_id, '_mq_categoria', true) ?: '—'));
                break;
            case 'mq_sezione':
                echo esc_html(get_post_meta($post_id, '_mq_sezione', true) ?: '—');
                break;
            case 'mq_prezzo':
                $p = get_post_meta($post_id, '_mq_prezzo', true);
                echo esc_html($p ? $p . '€' : '—');
                break;
        }
    }

    public function admin_sortable_columns(array $columns): array {
        $columns['mq_categoria'] = 'mq_categoria';
        $columns['mq_sezione']   = 'mq_sezione';
        $columns['mq_prezzo']    = 'mq_prezzo';
        return $columns;
    }

    public function ajax_get_menu(): void {
        check_ajax_referer('masquinator_ajax_nonce', 'nonce');

        $posts = get_posts([
            'post_type'      => 'mq_menu_item',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'orderby'        => 'title',
            'order'          => 'ASC',
        ]);

        $data = [];
        foreach ($posts as $post) {
            $tag_raw = get_post_meta($post->ID, '_mq_tag', true);
            $data[] = [
                'titolo'      => $post->post_title,
                'categoria'   => get_post_meta($post->ID, '_mq_categoria', true) ?: '',
                'sezione'     => get_post_meta($post->ID, '_mq_sezione', true) ?: '',
                'prezzo'      => get_post_meta($post->ID, '_mq_prezzo', true) ?: '',
                'descrizione' => $post->post_content,
                'tag'         => $tag_raw ? array_map('trim', explode(',', $tag_raw)) : [],
            ];
        }

        wp_send_json_success($data);
    }
}
