import {
  AccessToken,
  DataPacket_Kind,
  EgressClient,
  EncodedFileOutput,
  RoomServiceClient,
  S3Upload,
  TrackSource,
  WebhookReceiver,
} from "livekit-server-sdk";
import { encodeJson, type RoomSettings } from "./protocol";

/**
 * LiveKit (https://livekit.io) provides the media servers for live classes.
 * Required env: LIVEKIT_URL (wss://…), LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
 * Recording additionally needs the LIVEKIT_RECORDING_S3_* variables.
 */
export function liveKitConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret, httpUrl: url.replace(/^ws/, "http") };
}

export function isLiveKitConfigured() {
  return liveKitConfig() !== null;
}

function requireConfig() {
  const config = liveKitConfig();
  if (!config) throw new Error("Live classes are not configured: set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.");
  return config;
}

let roomClient: RoomServiceClient | null = null;
export function rooms() {
  const c = requireConfig();
  roomClient ??= new RoomServiceClient(c.httpUrl, c.apiKey, c.apiSecret);
  return roomClient;
}

let egressClient: EgressClient | null = null;
export function egress() {
  const c = requireConfig();
  egressClient ??= new EgressClient(c.httpUrl, c.apiKey, c.apiSecret);
  return egressClient;
}

export function webhookReceiver() {
  const c = requireConfig();
  return new WebhookReceiver(c.apiKey, c.apiSecret);
}

export type StudentPermissions = {
  allowStudentUnmute: boolean;
  allowStudentVideo: boolean;
  allowStudentScreenShare: boolean;
};

export function studentPublishSources(p: StudentPermissions): TrackSource[] {
  const sources: TrackSource[] = [];
  if (p.allowStudentUnmute) sources.push(TrackSource.MICROPHONE);
  if (p.allowStudentVideo) sources.push(TrackSource.CAMERA);
  if (p.allowStudentScreenShare) sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
  return sources;
}

export async function createAccessToken(params: {
  identity: string;
  name: string;
  room: string;
  isHost: boolean;
  permissions: StudentPermissions;
}) {
  const c = requireConfig();
  const token = new AccessToken(c.apiKey, c.apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: "6h",
    attributes: { role: params.isHost ? "host" : "student" },
  });
  token.addGrant({
    room: params.room,
    roomJoin: true,
    roomAdmin: params.isHost,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    ...(params.isHost ? {} : { canPublishSources: studentPublishSources(params.permissions) }),
  });
  return token.toJwt();
}

/** Room metadata carries the live settings every client renders from. */
export async function pushRoomSettings(roomNames: string[], settings: RoomSettings) {
  const metadata = JSON.stringify(settings);
  await Promise.all(
    roomNames.map((name) =>
      rooms()
        .updateRoomMetadata(name, metadata)
        .catch(() => undefined), // room not created yet (nobody joined) — it picks settings up at join time
    ),
  );
}

export async function sendToRoom(room: string, topic: string, payload: unknown, destinationIdentities?: string[]) {
  await rooms()
    .sendData(room, encodeJson(payload), DataPacket_Kind.RELIABLE, { topic, destinationIdentities })
    .catch(() => undefined);
}

export function recordingConfigured() {
  return Boolean(
    process.env.LIVEKIT_RECORDING_S3_BUCKET &&
      process.env.LIVEKIT_RECORDING_S3_ACCESS_KEY &&
      process.env.LIVEKIT_RECORDING_S3_SECRET,
  );
}

export async function startRecording(roomName: string, filename: string) {
  const output = new EncodedFileOutput({
    filepath: `live-classes/${filename}.mp4`,
    output: {
      case: "s3",
      value: new S3Upload({
        bucket: process.env.LIVEKIT_RECORDING_S3_BUCKET!,
        accessKey: process.env.LIVEKIT_RECORDING_S3_ACCESS_KEY!,
        secret: process.env.LIVEKIT_RECORDING_S3_SECRET!,
        region: process.env.LIVEKIT_RECORDING_S3_REGION ?? "",
        endpoint: process.env.LIVEKIT_RECORDING_S3_ENDPOINT ?? "",
        forcePathStyle: Boolean(process.env.LIVEKIT_RECORDING_S3_ENDPOINT),
      }),
    },
  });
  return egress().startRoomCompositeEgress(roomName, output, { layout: "speaker" });
}

/** Public URL for a recording file, if a public base URL is configured. */
export function recordingPublicUrl(filepath: string | undefined) {
  const base = process.env.LIVEKIT_RECORDING_PUBLIC_BASE_URL;
  if (!filepath) return null;
  if (/^https?:\/\//.test(filepath)) return filepath;
  return base ? `${base.replace(/\/$/, "")}/${filepath.replace(/^\//, "")}` : null;
}
