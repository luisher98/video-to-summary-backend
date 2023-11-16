import path from "path";
import { fileURLToPath } from "url";
import nodeExternals from "webpack-node-externals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: "./app.js",
  output: {
    path: path.join(__dirname, "dist"),
    publicPath: "/",
    chunkFormat: "module",
    filename: "app.js",
  },
  target: "node",
  externals: [nodeExternals()],
  experiments: {
    outputModule: true, 
  },
};
