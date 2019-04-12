import Hapi from "hapi";
import initDB from "./database";
import alasql from "alasql";
import alignJson from "hapi-align-json";

const server = Hapi.server({
  port: 3000,
  host: "localhost"
});

const bootstrap = async () => {
  await server.register(alignJson);
  await initDB(alasql);

  server.route([
    {
      method: "GET",
      path: "/api/v1/pharmacies/",
      handler: (request, h) => alasql("SELECT * FROM pharmacies")
    },
    {
      method: "GET",
      path: "/api/v1/pharmacies/nearest",
      handler: ({ query }, h) =>
        alasql(
          `SELECT *, haversine(?, ?, latitude, longitude) AS distance FROM pharmacies ORDER BY distance LIMIT ${query.limit ||
            1}`,
          [query.latitude, query.longitude]
        )
    }
  ]);
};

export const start = async () => {
  await bootstrap();
  await server.start();
  console.log(`Server running on ${server.info.uri}`);
  return server;
};

export const init = async () => {
  await bootstrap();
  await server.initialize();
  return server;
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});
