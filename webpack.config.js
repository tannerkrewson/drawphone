const webpack = require("webpack");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (_, { mode }) => ({
	entry: "./client/client.js",
	output: {
		filename: "client.js",
		path: path.resolve(__dirname, "server/public")
	},
	plugins: [
		new MiniCssExtractPlugin(),
		new webpack.ProvidePlugin({
			$: "jquery",
			jQuery: "jquery"
		})
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader"]
			},
			{
				test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
				loader: "url-loader"
			}
		]
	}
});
