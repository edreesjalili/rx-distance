import Hapi from "hapi";
import { default as db, waitForDbInit } from "./database";
import alignJson from "hapi-align-json";

const mount = async () => {
  const server = Hapi.server({
    port: 3000,
    host: "localhost",
    router: {
      stripTrailingSlash: true
    }
  });

  await server.register(alignJson);
  await waitForDbInit();

  server.route([
    {
      method: "GET",
      path: "/api/v1/pharmacies",
      handler: (request, h) => db("SELECT * FROM pharmacies")
    },
    {
      method: "GET",
      path: "/api/v1/pharmacies/nearest",
      handler: ({ query }, h) =>
        db(
          `SELECT *, haversine(?, ?, latitude, longitude) AS distance FROM pharmacies ORDER BY distance LIMIT ${query.limit ||
            1}`,
          [query.latitude, query.longitude]
        )
    }
  ]);
  return server;
};

export const init = async () => {
  const server = await mount();
  await server.initialize();
  return server;
};

export const start = async () => {
  const server = await mount();
  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});
