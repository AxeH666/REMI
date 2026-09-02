import "server-only";

import {
  GoogleGenAI,
  createPartFromUri,
  createUserContent,
  type File as GeminiSdkFile,
} from "@google/genai";

import { analysisResultJsonSchema } from "./analysis-schema";
import { buildUserContextPrompt, REMI_SYSTEM_PROMPT } from "./prompts";
import { MP4_MIME_TYPE } from "./validation";

export const GEMINI_REQUEST_TIMEOUT_MS = 110_000;
export const GEMINI_DELETE_TIMEOUT_MS = 10_000;

export type GeminiRemoteFile = {
  name?: string;
  uri?: string;
  mimeType?: string;
  state?: string;
};

export type GeminiGenerateInput = {
  model: string;
  fileUri: string;
  mimeType: string;
  prompt: string;
  signal: AbortSignal;
};

export interface GeminiGateway {
  uploadVideo(video: Blob): Promise<GeminiRemoteFile>;
  getFile(name: string, signal: AbortSignal): Promise<GeminiRemoteFile>;
  generateAnalysis(input: GeminiGenerateInput): Promise<string | undefined>;
  deleteFile(name: string): Promise<void>;
}

export function createGeminiGateway(apiKey: string): GeminiGateway {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
  });

  return {
    async uploadVideo(video) {
      const file = await client.files.upload({
        file: video,
        // In SDK 2.20.0, upload-level abort/http options are not propagated to
        // the byte upload. The client-level timeout above bounds that request.
        config: { mimeType: MP4_MIME_TYPE },
      });

      return normalizeRemoteFile(file);
    },

    async getFile(name, signal) {
      const file = await client.files.get({
        name,
        config: { abortSignal: signal },
      });

      return normalizeRemoteFile(file);
    },

    async generateAnalysis({ model, fileUri, mimeType, prompt, signal }) {
      const response = await client.models.generateContent({
        model,
        contents: createUserContent([
          createPartFromUri(fileUri, mimeType),
          buildUserContextPrompt(prompt),
        ]),
        config: {
          abortSignal: signal,
          responseJsonSchema: analysisResultJsonSchema,
          responseMimeType: "application/json",
          systemInstruction: REMI_SYSTEM_PROMPT,
        },
      });

      return response.text;
    },

    async deleteFile(name) {
      const cleanupSignal = AbortSignal.timeout(GEMINI_DELETE_TIMEOUT_MS);

      await client.files.delete({
        name,
        config: {
          abortSignal: cleanupSignal,
          httpOptions: { timeout: GEMINI_DELETE_TIMEOUT_MS },
        },
      });
    },
  };
}

function normalizeRemoteFile(file: GeminiSdkFile): GeminiRemoteFile {
  return {
    name: file.name,
    uri: file.uri,
    mimeType: file.mimeType,
    state: file.state?.toString(),
  };
}
