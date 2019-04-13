import { expect } from "chai";
import { createReadStream } from "fs";
import path from "path";
import csv from "csv-parser";
import { init } from "../lib/server";

const API_ROUTE = "/api/v1/pharmacies";

describe("API /pharmacies", () => {
  let server;

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("GET /pharmacies", () => {
    let subject;

    beforeEach("Send GET", async () => {
      subject = await server.inject({
        method: "GET",
        url: API_ROUTE
      });
    });

    it("responds with all available pharmacies", async () => {
      const allPharmacies = await getAllPharmacies();
      expect(subject.statusCode).to.equal(200);
      expect(JSON.parse(subject.payload)).to.eql(allPharmacies);
    });
  });
});

function getAllPharmacies() {
  return new Promise((resolve, reject) => {
    let entries = [];

    createReadStream(path.join(__dirname, "data", "pharmacies.csv"))
      .pipe(csv())
      .on("data", data => entries.push(data))
      .on("error", reject)
      .on("end", () => resolve(entries));
  });
}
