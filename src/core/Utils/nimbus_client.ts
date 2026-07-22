import { StatusCodes } from "http-status-codes";
import nimbusConfig from "../config/nimbus_config";
import NimbusError from "./nimbus_errors";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface NimAsset {
  _id: string;
  filename: string;
  key: string;
  mimeType: string;
  kind: "image" | "video" | "audio" | "document" | "archive" | "other";
  size: number;
  url: string | null;
  downloadUrl?: string;
  tags: string[];
  status: string;
}

interface NimUploadResponse {
  uploaded: NimAsset[];
  count: number;
  note?: string;
}

function assertConfig() {
  if (!nimbusConfig.apiKey) {
    throw new NimbusError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "NIMBUS_NOT_CONFIGURED",
      "NIMBUS_API_KEY is not set",
    );
  }
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${nimbusConfig.apiKey}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      payload?.error?.message ?? `Nimbus call failed (${response.status})`;
    throw new NimbusError(
      response.status >= 500 ? StatusCodes.BAD_GATEWAY : response.status,
      payload?.error?.code ?? "NIMBUS_ERROR",
      errorMsg,
    );
  }

  return payload as T;
}

export async function uploadFileToNimbus({
  file,
  tags,
  folderId,
}: {
  file: Express.Multer.File;
  tags?: string;
  folderId?: string;
}): Promise<NimAsset> {
  assertConfig();

  const form = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
  form.append("file", blob, file.originalname);

  if (tags) form.append("tags", tags);
  if (folderId) form.append("folderId", folderId);

  let response: Response;
  try {
    response = await fetch(`${nimbusConfig.baseUrl}/assets/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error: any) {
    const timedOut =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new NimbusError(
      StatusCodes.BAD_GATEWAY,
      timedOut ? "NIMBUS_TIMEOUT" : "NIMBUS_UNREACHABLE",
      timedOut
        ? "Nimbus did not respond in time"
        : "Nimbus is unreachable",
    );
  }

  const data = await handleResponse<NimUploadResponse>(response);
  const asset = data.uploaded?.[0];

  if (!asset) {
    throw new NimbusError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "NIMBUS_EMPTY_RESPONSE",
      "Nimbus returned no uploaded assets",
    );
  }

  return asset;
}

export async function deleteFileFromNimbus(
  assetId: string,
): Promise<boolean> {
  assertConfig();

  try {
    const response = await fetch(`${nimbusConfig.baseUrl}/assets/${assetId}`, {
      method: "DELETE",
      headers: authHeaders(),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const payload: any = await response.json().catch(() => ({}));
      console.error(
        `[Nimbus] Deletion failed for ${assetId}: ${payload?.error?.message ?? response.status}`,
      );
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(
      `[Nimbus] Error deleting asset ${assetId}: ${error.message}`,
    );
    return false;
  }
}
