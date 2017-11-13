const webpack = require("webpack");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const extractSass = new ExtractTextPlugin({
   filename: "[name].[contenthash].css",
   disable: process.env.NODE_ENV === "development"
});

module.exports = [
    {
        entry: {
            app: "./src/app.tsx",
            styles: "./src/styles/app.scss",
            globals: ["react", "react-dom"]
        },

        output: {
            filename: "[name].js",
            path: __dirname + "/dist/assets"
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
        },

        module: {
            rules: [
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

                // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
                { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

                {
                    test: /\.scss$/,
                    use: extractSass.extract({
                        use: [
                            {loader: "style-loader"},
                            {loader: "css-loader", options: { sourceMap: true }},
                            {loader: "sass-loader", options: { sourceMap: true }}
                        ]
                    })
                }
            ]
        },

        plugins: [
            new webpack.optimize.CommonsChunkPlugin({ name: "globals", filename: "globals.js" }),
            extractSass
        ]
    }
]
