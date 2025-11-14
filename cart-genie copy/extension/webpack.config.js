// webpack.config.js
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    // Add this line to use a CSP-compliant source map style
    devtool: 'inline-source-map',

    // Define the entry points for your extension's scripts
    entry: {
        popup: './src/popup.ts',
        background: './src/background.ts',
        content_script: './src/content_script.ts',
    },
    // Configure the output directory and filenames
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true, // This cleans the 'dist' folder before each build
    },
    // Define how different types of modules will be treated
    module: {
        rules: [
            {
                test: /\.ts$/, // All files ending in .ts will be handled by ts-loader
                use: 'ts-loader',
                exclude: /node_modules/, // Don't process files in node_modules
            },
        ],
    },
    // Configure how modules are resolved
    resolve: {
        extensions: ['.ts', '.js'], // Attempt to resolve these extensions automatically
    },
    // Add plugins for additional build steps
    plugins: [
        // This plugin copies static files from 'public' to the output 'dist' folder
        new CopyPlugin({
            patterns: [
                { from: 'public', to: '.' }, // Copy contents of public to the dist root
            ],
        }),
    ],
};
