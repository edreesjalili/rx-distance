import config from "./config.json";

export default function configuration() {
  return {
    ...{ port: process.env.PORT },
    ...config[process.env.NODE_ENV || "development"]
  };
}
