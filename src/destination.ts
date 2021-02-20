const WORKER_ID_MASK = 0b1000_0000_0000_0000;
const WORKER_MASK = 0b0111_1111_0000_0000;

export enum Destination {
  Context = 0b001,
  Content = 0b010,
  Background = 0b100,
  Passthrough = 0b001 | 0b010 | 0b100
}

export function isContext(dst: number | Destination) {
  return !!(dst & Destination.Context);
}

export function isContent(dst: number | Destination) {
  return !!(dst & Destination.Content);
}

export function isBackground(dst: number | Destination) {
  return !!(dst & Destination.Background);
}

export function isPassthrough(dst: number | Destination) {
  return (dst & Destination.Passthrough) === Destination.Passthrough;
}

export function isWorker(dst: number | Destination) {
  return !!(dst & WORKER_ID_MASK);
}

export function getWorkerId(dst: number | Destination) {
  return (dst & WORKER_MASK) >> 8;
}
