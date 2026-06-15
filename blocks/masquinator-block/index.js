(function () {
    const { registerBlockType } = wp.blocks;
    const { __ } = wp.i18n;

    registerBlockType('masquinator/widget', {
        title: __('Masque Matchmaker', 'masquinator'),
        description: __('Inserisce il widget Masquinator per raccomandazioni menu interattive.', 'masquinator'),
        category: 'widgets',
        icon: 'smiley',
        edit: function () {
            return wp.element.createElement(
                'div',
                {
                    style: {
                        background: '#1a1a2e',
                        border: '2px solid #c5a059',
                        borderRadius: '12px',
                        padding: '24px',
                        textAlign: 'center',
                        color: '#f4ebd8',
                    },
                },
                wp.element.createElement('div', {
                    style: { fontSize: '48px', marginBottom: '12px' },
                    children: '🎭',
                }),
                wp.element.createElement('h3', {
                    style: { color: '#c5a059', margin: '0 0 8px' },
                    children: 'Masquinator',
                }),
                wp.element.createElement('p', {
                    style: { margin: 0, fontSize: '14px' },
                    children: __('Il widget verrà visualizzato sul frontend.', 'masquinator'),
                })
            );
        },
        save: function () {
            return null;
        },
    });
})();
