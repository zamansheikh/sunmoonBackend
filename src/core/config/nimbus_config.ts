import dotenv from "dotenv";

dotenv.config();

const nimbusConfig = {
  baseUrl: (process.env.NIMBUS_BASE_URL || "https://capi.tecsior.com/api/v1").replace(/\/$/, ""),
  apiKey: process.env.NIMBUS_API_KEY || "",
};

export default nimbusConfig;
