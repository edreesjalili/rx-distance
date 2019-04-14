import Hapi from "hapi";
import Joi from "joi";
import { default as db, waitForDbInit } from "./database";
import alignJson from "hapi-align-json";
import configuration from "../config";

const config = configuration();

/**
 * Creates the a new instance of a Hapi server. Is responsible for mounting the routes and plugins. Waits for the database to be initialized before returning the new instance.
 */
const mount = async () => {
  const server = Hapi.server({
    port: config.port,
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
      handler: ({ query }, h) => {
        return db(
          `SELECT *, CAST(HAVERSINE(?, ?, latitude, longitude) AS NUMBER) AS distance FROM pharmacies ORDER BY distance LIMIT ${
            query.limit
          }`,
          [query.latitude, query.longitude]
        );
      },
      options: {
        validate: {
          query: {
            limit: Joi.number()
              .integer()
              .min(1)
              .max(100)
              .default(1),
            latitude: Joi.number()
              .precision(7)
              .min(-85)
              .max(85)
              .required(),
            longitude: Joi.number()
              .precision(7)
              .min(-180)
              .max(180)
              .required()
          }
        }
      }
    },
    {
      method: "*",
      path: "/{any*}",
      handler: (request, h) => h.redirect("/api/v1/pharmacies")
    }
  ]);
  return server;
};

/** Initializes a Hapi server. Primarily used for testing. */
export const init = async () => {
  const server = await mount();
  await server.initialize();
  return server;
};

/** Starts a Hapi server. */
export const start = async () => {
  const server = await mount();
  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});
