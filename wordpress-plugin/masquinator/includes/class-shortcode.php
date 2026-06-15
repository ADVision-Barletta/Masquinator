<?php
declare(strict_types=1);

namespace Masquinator\Frontend;

defined('ABSPATH') || exit;

class Shortcode {

    public function init(): void {
        add_shortcode('masquinator', [$this, 'render']);
    }

    public function render(array $atts = []): string {
        $options = get_option('masquinator_settings', []);
        if (empty($options['enabled'])) {
            return '';
        }

        ob_start();
        ?>
        <div id="mq-widget-root" data-masquinator="true">
            <button id="mq-launcher" class="mq-launcher" aria-label="<?php esc_attr_e('Apri il Genio del Masque', 'masquinator'); ?>" aria-expanded="false" onclick="mq_toggleWidget()">
                <span class="mq-mascot-emoji">🎭</span>
            </button>

            <div id="mq-overlay" class="mq-overlay">
                <div id="mq-modal" class="mq-modal" role="dialog" aria-modal="true" aria-label="Masquinator">
                    <button class="mq-close" aria-label="<?php esc_attr_e('Chiudi', 'masquinator'); ?>" onclick="mq_closeWidget()">&times;</button>

                    <div id="mq-app">
                        <div id="mq-start" class="mq-screen mq-active">
                            <img id="mq-logo" class="mq-logo" src="" alt="">
                            <div class="mq-mascot-container mq-floating">
                                <div class="mq-mascot-emoji">🎭</div>
                            </div>
                            <h1 class="mq-title-serif" data-mq="app-title">Masquinator</h1>
                            <p class="mq-subtitle" data-mq="subtitle"><?php esc_html_e('Il Genio del Masque', 'masquinator'); ?></p>

                            <div class="mq-speech-bubble" data-mq="start-bubble">
                                "<?php esc_html_e('Accomodati. Rispondi a 6 semplici domande e lascerò che sia il palcoscenico a servirti la cena perfetta.', 'masquinator'); ?>"
                            </div>

                            <button class="mq-btn mq-btn-gold" data-mq="start-button" onclick="mq_startQuiz()"><?php esc_html_e('Inizia l\'Atto', 'masquinator'); ?></button>
                        </div>

                        <div id="mq-quiz" class="mq-screen">
                            <div class="mq-header-progress">
                                <button id="mq-back" class="mq-nav-back" onclick="mq_goBack()" aria-label="<?php esc_attr_e('Torna alla domanda precedente', 'masquinator'); ?>">‹</button>
                                <span><?php esc_html_e('ATTO', 'masquinator'); ?> <span id="mq-current-num">1</span> <?php esc_html_e('DI 6', 'masquinator'); ?></span>
                                <div class="mq-progress-bar"><div id="mq-progress-fill"></div></div>
                            </div>

                            <div class="mq-mascot-container mq-mascot-small mq-floating">
                                <div class="mq-mascot-emoji">🎭</div>
                            </div>

                            <div class="mq-speech-bubble">
                                <h2 id="mq-question-text" class="mq-question-serif"><?php esc_html_e('Domanda?', 'masquinator'); ?></h2>
                            </div>

                            <div id="mq-answers" class="mq-answers-stack"></div>

                            <div class="mq-quiz-footer">
                                <button class="mq-btn-text" onclick="mq_randomChoice()"><?php esc_html_e('Lascia fare al Genio', 'masquinator'); ?></button>
                                <button class="mq-btn-text" onclick="mq_resetToStart()"><?php esc_html_e('Ricomincia da capo', 'masquinator'); ?></button>
                            </div>
                        </div>

                        <div id="mq-loading" class="mq-screen mq-center-all">
                            <div class="mq-mascot-container mq-shaking">
                                <div class="mq-mascot-emoji">🎭</div>
                            </div>
                            <p class="mq-loading-text"><?php esc_html_e('Sto interrogando gli spiriti della cucina...', 'masquinator'); ?></p>
                        </div>

                        <div id="mq-results" class="mq-screen">
                            <div class="mq-mascot-container mq-mascot-tiny">
                                <div class="mq-mascot-emoji">🎭</div>
                            </div>

                            <h2 id="mq-result-desc" class="mq-title-serif mq-result-intro"><?php esc_html_e('La rivelazione:', 'masquinator'); ?></h2>

                            <div id="mq-menu-output" class="mq-menu-list"></div>

                            <div class="mq-footer">
                                <button class="mq-btn mq-btn-gold" onclick="mq_downloadImage()"><?php esc_html_e('Scarica la pergamena', 'masquinator'); ?></button>
                                <button class="mq-btn mq-btn-outline" onclick="mq_resetToStart()"><?php esc_html_e('Cala il Sipario (Riprova)', 'masquinator'); ?></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}
