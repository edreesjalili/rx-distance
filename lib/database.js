import csv from "csv-parser";
import fs from "fs";
import path from "path";
import haversine from "haversine";
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
  const start = {
    latitude: startLat,
    longitude: startLong
  };
  const end = {
    latitude: endLat,
    longitude: endLong
  };
  return haversine(start, end, { unit: "mile" });
};

export default alasql;

export let waitForDbInit = () =>
  new Promise(resolve => {
    initialized ? resolve() : null;
    const check = setInterval(() => {
      if (initialized) {
        console.log("Database Initialized");
        clearInterval(check);
        resolve();
      }
    }, 200);
  });
