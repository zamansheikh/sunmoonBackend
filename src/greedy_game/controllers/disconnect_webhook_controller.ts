import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import { IDisconnectWebhookService } from "../services/disconnect_webhook_service";

export default class DisconnectWebhookController {
  private service: IDisconnectWebhookService;

  constructor(service: IDisconnectWebhookService) {
    this.service = service;
  }

  handleDisconnect = catchAsync(async (req, res) => {
    const result = await this.service.handleDisconnect(req.body);
    res.status(StatusCodes.OK).json(result);
  });
}
