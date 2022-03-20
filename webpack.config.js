"use strict";

const path = require("path");

module.exports = {
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  target: "node", // extensions run in a node context
  node: {
    __dirname: false, // leave the __dirname-behaviour intact
  },
  entry: {
    "client/out/extension": path.resolve(__dirname, "client/src/extension.ts"),
    "server/out/server": path.resolve(__dirname, "server/src/server.ts"),
  },
  resolve: {
    mainFields: ["module", "main"],
    extensions: [".ts", ".js"], // support ts-files and js-files
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            // configure TypeScript loader:
            // * enable sources maps for end-to-end source maps
            loader: "ts-loader",
            options: {
              compilerOptions: {
                sourceMap: true,
              },
            },
          },
        ],
      },
    ],
  },
  externals: {
    vscode: "commonjs vscode", // ignored because it doesn't exist
  },
  output: {
    path: path.resolve(__dirname),
    // all output goes into `dist`.
    // packaging depends on that and this must always be like it
    filename: "[name].js",
    libraryTarget: "commonjs",
  },
  // yes, really source maps
  devtool: "source-map",
};
