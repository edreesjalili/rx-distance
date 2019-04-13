import { expect } from "chai";
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

    it("responds with status code 200", async () =>
      expect(subject.statusCode).to.equal(200));

    it("responds with all available pharmacies", async () => {
      allPharmacies = await getAllPharmacies();
      expect(subject.payload).to.equal(allPharmacies);
    });
  });
});

const getAllPharmacies = () =>
  new Promise((resolve, reject) => {
    const entries = [];

    fs.createReadStream(path.join(__dirname, "data", "pharmacies.csv"))
      .pipe(csv())
      .on("data", data => entries.push(data))
      .on("error", reject)
      .on("end", () => resolve(entries));
  });
