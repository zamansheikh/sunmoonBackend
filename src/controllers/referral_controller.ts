import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { UAParser } from "ua-parser-js";

export default class ReferralController {
  /**
   * Handles the initial click on a referral link.
   * Grabs the IP and Device Info (parsed from User-Agent) and logs them.
   */
  handleReferralRedirect = catchAsync(async (req: Request, res: Response) => {
    const { inviteCode } = req.params;

    // 1. Grab IP Address
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 2. Parse User-Agent using ua-parser-js
    const parser = new UAParser(req.headers["user-agent"]);
    const deviceInfo = parser.getResult();

    // 3. Log the formatted JSON as requested
    console.log("--- Referral Click Detected (Parsed) ---");
    console.log(`Invite Code: ${inviteCode}`);
    console.log(`IP Address: ${ipAddress}`);
    console.log("Device Info:", JSON.stringify(deviceInfo, null, 2));
    console.log("----------------------------------------");

    // Send standardized response with the parsed data
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Referral click logged successfully.",
      result: {
        ipAddress,
        deviceInfo, // Sending the clean JSON back
        inviteCode
      }
    });
  });
}
