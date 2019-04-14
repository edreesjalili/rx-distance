import csv from "csv-parser";
import fs from "fs";
import path from "path";
import LatLon from "geodesy/latlon-spherical";
import alasql from "alasql";
import configuration from "../config/config.js";

const config = configuration();

const TYPES = {
  STRING: "STRING",
  NUMBER: "NUMBER"
};

const headers = [
  { field: "name", type: TYPES.STRING },
  { field: "address", type: TYPES.STRING },
  { field: "city", type: TYPES.STRING },
  { field: "state", type: TYPES.STRING },
  { field: "zip", type: TYPES.STRING },
  { field: "latitude", type: TYPES.NUMBER },
  { field: "longitude", type: TYPES.NUMBER }
];

const mapHeader = ({ field, type }) => `${field} ${type}`;

let entries = [];
let initialized = false;

fs.createReadStream(
  path.join(__dirname, "..", config.dataSourceDirectory, "pharmacies.csv")
)
  .pipe(
    csv({
      mapValues: ({ header, index, value }) => value.trim()
    })
  )
  .on("data", data => entries.push(data))
  .on("error", console.log)
  .on("end", () => {
    alasql(`CREATE TABLE pharmacies (${headers.map(mapHeader).join(",")})`);
    alasql("INSERT INTO pharmacies SELECT * FROM ?", [entries]);
    initialized = true;
  });

alasql.fn.haversine = (startLat, startLong, endLat, endLong) => {
  return new LatLon(startLat, startLong).distanceTo(
    new LatLon(endLat, endLong)
  );
};

alasql.fn.HAVERSINE = alasql.fn.haversine;

alasql.fn.round = (value, digits) => {
  return Number.parseFloat(value).toFixed(digits);
};

alasql.fn.ROUND = alasql.fn.round;

export default alasql;

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
