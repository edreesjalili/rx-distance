import csv from "csv-parser";
import fs from "fs";
import path from "path";
import haversine from "haversine";
import config from "../config/config.js";

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

const mountCustomFunctions = alasql => {
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
};

export default function initDB(alasql) {
  mountCustomFunctions(alasql);
  const dataDir = config().dataSourceDirectory;
  return new Promise((resolve, reject) => {
    const entries = [];

    fs.createReadStream(path.join(__dirname, "..", dataDir, "pharmacies.csv"))
      .pipe(
        csv({
          mapValues: ({ header, index, value }) => value.trim()
        })
      )
      .on("data", data => entries.push(data))
      .on("error", reject)
      .on("end", () => {
        alasql(`CREATE TABLE pharmacies (${headers.map(mapHeader).join(",")})`);
        alasql("INSERT INTO pharmacies SELECT * FROM ?", [entries]);
        console.log("Data loaded...");
        resolve();
      });
  });
}
