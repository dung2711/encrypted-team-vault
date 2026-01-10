const webpack = require('webpack');

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};

    Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "process/browser": require.resolve("process/browser.js"),
        "vm": false,
        "fs": false,
        "path": false,
    });

    config.resolve.fallback = fallback;

    // Allow .js extensions for ESM modules
    config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx']
    };

    config.resolve.fullySpecified = false;

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer']
        })
    ]);

    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
};
