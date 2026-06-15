<?php
declare(strict_types=1);

namespace Masquinator;

defined('ABSPATH') || exit;

class Deactivator {

    public static function deactivate(): void {
        flush_rewrite_rules();
    }
}
