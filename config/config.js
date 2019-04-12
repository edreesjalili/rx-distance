import config from "./config.json";

export default function get() {
  return config[process.env.NODE_ENV || "development"];
}
