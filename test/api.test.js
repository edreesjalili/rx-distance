import { expect } from "chai";
import { init } from "../lib/server";

describe("API /pharmacies", () => {
  let server;

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("GET /pharmacies", () => {
    it("responds with status code 200", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/pharmacies"
      });

      expect(res.statusCode).to.equal(200);
    });
  });
});
