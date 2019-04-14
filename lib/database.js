import csv from "csv-parser";
import fs from "fs";
import path from "path";
import LatLon from "geodesy/latlon-spherical";
import alasql from "alasql";
import convert from "convert-units";
import configuration from "../config/config.js";

const config = configuration();

const headers = [
  "name",
  "address",
  "city",
  "state",
  "zip",
  "latitude",
  "longitude"
];

let entries = [];
let initialized = false;

fs.createReadStream(
  path.join(__dirname, "..", config.dataSourceDirectory, "pharmacies.csv")
)
  .pipe(
    csv({
      mapValues: ({ header, index, value }) =>
        isNaN(value) ? value.trim() : Number(value)
    })
  )
  .on("data", data => entries.push(data))
  .on("error", console.log)
  .on("end", () => {
    alasql(`CREATE TABLE pharmacies (${headers.join(",")})`);
    alasql("INSERT INTO pharmacies SELECT * FROM ?", [entries]);
    initialized = true;
  });

alasql.fn.haversine = (startLat, startLong, endLat, endLong) => {
  const start = new LatLon(startLat, startLong);
  const end = new LatLon(endLat, endLong);
  return convert(start.distanceTo(end))
    .from("m")
    .to("mi")
    .toFixed(2);
};

alasql.fn.HAVERSINE = alasql.fn.haversine;

export default alasql;

/** Asynchronous function used to signal when the database is ready. */
export let waitForDbInit = () =>
  new Promise(resolve => {
    if (initialized) {
      return resolve();
    }
    const check = setInterval(() => {
      if (initialized) {
        clearInterval(check);
        resolve();
      }
    }, 200);
  });
