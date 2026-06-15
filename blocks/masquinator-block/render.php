<?php
/**
 * Block render callback for Masquinator widget.
 *
 * @package Masquinator
 */

defined('ABSPATH') || exit;

$shortcode = new \Masquinator\Frontend\Shortcode();
echo $shortcode->render();
