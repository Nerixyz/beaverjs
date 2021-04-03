import { Destination } from './destination';

export interface ContextSendOptions {
  prefix: string;
}

export type StructuredCloneData =
  | null
  | undefined
  | string
  | number
  | bigint
  | boolean
  | Boolean
  | String
  | Date
  | RegExp
  | Blob
  | File
  | FileList
  | ArrayBuffer
  | ArrayBufferView
  | ImageBitmap
  | ImageData
  | Array<StructuredCloneData>
  | Record<string | number, any>
  | Map<StructuredCloneData, StructuredCloneData>
  | Set<StructuredCloneData>;

export interface InternalMessageData {
  event: string;
  data: StructuredCloneData;
}

export interface InternalMessage {
  destination: Destination;
  data: InternalMessageData;
}
