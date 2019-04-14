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

    it("ignores trailing /", async () => {
      options.route += "/";
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
    const boundedDistances = [0.34, 3.76, 69.19];
    let options;

    async function getRxWithDistances() {
      return (await getSortedPharmacies()).map((rx, index) => {
        return { distance: boundedDistances[index], ...rx };
      });
    }

    beforeEach(() => {
      options = {
        route: `${PHARMACY_API_ROUTE}/nearest`
      };
    });

    describe("with invalid query parameters", () => {
      const respondsWith400 = "responds with status code 400";
      const invalidQueries = [
        {
          case: "when there are no query parameters",
          query: {}
        },
        {
          case: "when the latitude is missing",
          query: {
            longitude: 0
          }
        },
        {
          case: "when the longitude is missing",
          query: {
            latitude: 0
          }
        },
        {
          case: "when the latitude is greater than 85",
          query: {
            latitude: 100
          }
        },
        {
          case: "when the latitude is less than 85",
          query: {
            latitude: -100
          }
        },
        {
          case: "when the longitude is greater than 180",
          query: {
            longitude: 200
          }
        },
        {
          case: "when the longitude is less than -180",
          query: {
            longitude: -200
          }
        },
        {
          case: "when the limit is less than 1",
          query: {
            longitude: 0,
            longitude: -200,
            limit: 0
          }
        },
        {
          case: "when the longitude is greater than 100",
          query: {
            longitude: 0,
            longitude: 0,
            limit: 101
          }
        }
      ].forEach(invalidQuery => {
        it(`${respondsWith400} ${invalidQuery.case}`, async () => {
          const subject = await sendRequest({ ...options });
          expect(subject.statusCode).to.equal(400);
        });
      });
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
        it("returns a limited list of pharmacies sorted by distance", async () => {
          options.query.limit = 2;

          const subject = await sendRequest({ ...options });
          const expected = (await getRxWithDistances()).slice(0, 2);

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
      .pipe(
        csv({
          mapValues: ({ header, index, value }) =>
            isNaN(value) ? value.trim() : Number(value)
        })
      )
      .on("data", data => entries.push(data))
      .on("error", reject)
      .on("end", () => resolve(entries));
  });
}

async function getSortedPharmacies() {
  return (await getAllPharmacies()).sort((a, b) => a.name - b.name);
}
