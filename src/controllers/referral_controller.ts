import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";
import { StatusCodes } from "http-status-codes";

export default class ReferralController {
  /**
   * Handles the initial click on a referral link.
   * Grabs the IP and Device Info (User Agent) and logs them.
   */
  handleReferralRedirect = catchAsync(async (req: Request, res: Response) => {
    const { inviteCode } = req.params;

    // 1. Grab IP Address (handling potential proxy headers)
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 2. Grab Device Info (User-Agent)
    const userAgent = req.headers["user-agent"];

    // 3. Log the data as requested
    console.log("--- Referral Click Detected ---");
    console.log(`Invite Code: ${inviteCode}`);
    console.log(`IP Address: ${ipAddress}`);
    console.log(`User-Agent (Device Info): ${userAgent}`);
    console.log("-------------------------------");

    // Send standardized response matching the project pattern
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Referral click logged successfully.",
      result: {
        ipAddress,
        userAgent,
        inviteCode
      }
    });
  });
}
