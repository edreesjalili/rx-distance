import { expect } from "chai";
import { createReadStream } from "fs";
import path from "path";
import csv from "csv-parser";
import { init } from "../lib/server";

const PHARMACY_API_ROUTE = "/api/v1/pharmacies";

describe("API /pharmacies", () => {
  let server;

  const sendRequest = async options => {
    const query = options.query
      ? Object.entries(options.query)
          .reduce((acc, pair) => (acc += "&" + pair.join("=")), "")
          .slice(1)
      : "";
    return await server.inject({
      method: "GET",
      url: `${options.route}?${query}`
    });
  };

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("GET /pharmacies", () => {
    const options = {
      route: PHARMACY_API_ROUTE
    };

    it("responds with status code 200 when there is a trailing /", async () => {
      const subject = await sendRequest({ ...options });
      expect(subject.statusCode).to.eq(200);
    });

    it("returns all available pharmacies", async () => {
      const subject = await sendRequest({ ...options });
      const parsedJson = JSON.parse(subject.payload);
      expect(subject.statusCode).to.eq(200);
      expect(parsedJson)
        .to.be.an("array")
        .that.eql(await getAllPharmacies());
    });
  });

  describe("GET /pharmacies/nearest", () => {
    let latitude = 38.897147;
    let longitude = -77.043934;
    // calculated distances using https://www.geodatasource.com/distance-calculator
    const boundedDistances = [0.34, 86.83, 899.12];
    let options;

    async function getRxWithDistances() {
      return (await getAllPharmacies()).map((rx, index) => {
        return { distance: boundedDistances[index], ...rx };
      });
    }

    beforeEach(() => {
      options = {
        route: `${PHARMACY_API_ROUTE}/nearest`
      };
    });

    describe("with valid query parameters", () => {
      beforeEach(() => {
        options.query = {
          latitude,
          longitude
        };
      });

      it("returns the closest pharmacy", async () => {
        const subject = await sendRequest({ ...options });
        const expected = [(await getRxWithDistances())[0]];

        expect(subject.statusCode).to.equal(200);
        expect(JSON.parse(subject.payload)).to.eql(expected);
      });

      describe("with a limit query parameter", () => {
        it("returns a list of pharmacies sorted by distance", async () => {
          options.query.limit = 20;

          const subject = await sendRequest({ ...options });
          const expected = await getRxWithDistances();

          expect(subject.statusCode).to.equal(200);
          expect(JSON.parse(subject.payload)).to.eql(expected);
        });
      });

      it("returns the closest when the coordinate parameters are strings", async () => {
        options.query = {
          latitude: latitude.toString(),
          longitude: longitude.toString()
        };

        const subject = await sendRequest({ ...options });
        const expected = [(await getRxWithDistances())[0]];

        expect(subject.statusCode).to.equal(200);
        expect(JSON.parse(subject.payload)).to.eql(expected);
      });
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

async function getSortedPharmacies() {
  return (await getAllPharmacies()).sort((a, b) => a.name - b.name);
}
