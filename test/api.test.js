const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const { init } = require("../lib/server");

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
