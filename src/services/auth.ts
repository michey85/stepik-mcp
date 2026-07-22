import { logger } from "../logger.js";

const BASE_URL = "https://stepik.org/oauth2/token/";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export const getAccessToken = async (): Promise<string> => {
  logger.info("Requesting Stepik access token", { url: BASE_URL });

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.STEPIK_CLIENT_ID,
      client_secret: process.env.STEPIK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    logger.error("Failed to get access token", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data: TokenResponse = await response.json();

  const accessToken = data.access_token;
  if (!accessToken) {
    logger.error("Access token not found in response", { responseData: data });
    throw new Error("Access token not found in response");
  }

  return accessToken;
};
