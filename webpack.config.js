const webpack = require("webpack");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const AssetsPlugin = require("assets-webpack-plugin");

const OUTPUT_DIR = path.resolve(__dirname, "server/public");

module.exports = (_, { mode }) => ({
    entry: "./client/client.js",
    output: {
        filename: "[name].[hash].js",
        path: OUTPUT_DIR,
        publicPath: "",
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: "[name].[hash].css" }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
        }),
        new AssetsPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
                loader: "url-loader",
            },
            {
                test: /\.svg$/,
                loader: "file-loader",
                options: {
                    name: "[name].[ext]",
                },
            },
        ],
    },
});
