import { Tail, Reverse } from "typescript-tuple";

type Fn = (...args: any) => any;

type RemoveLast<T extends any[]> = Reverse<Tail<Reverse<T>>>;

type Last<T extends any[]> = T[Exclude<keyof T, keyof Tail<T>>];

type LastParameter<F extends (...args: any) => any> = Last<Parameters<F>>;

export interface BeforeSync<T extends Fn> {
  (...args: Parameters<T>): void;
  bail: (returnValue: ReturnType<T>) => void;
}

export interface BeforeAsync<T extends Fn, Cb extends Fn> {
  (...args: RemoveLast<Parameters<T>>): void;
  bail: (...args: Parameters<Cb>) => void;
}

export interface BeforeAsyncNoCallback<T extends Fn> {
  (...args: Parameters<T>): void;
}

export interface AfterSync<T extends Fn> {
  (returnValue: ReturnType<T>): void;
  bail: (returnValue: ReturnType<T>) => void;
}

export interface AfterAsync<T extends Fn> {
  (...args: Parameters<T>): void;
  bail: (...args: Parameters<T>) => void;
}

export type SyncHook<T extends Fn> = T & {
  before: (
    hook: (next: BeforeSync<T>, ...args: Parameters<T>) => void
  ) => SyncHook<T>;
  after: (
    hook: (next: AfterSync<T>, returnValue: ReturnType<T>) => void
  ) => SyncHook<T>;
};

export type AsyncHookCallback<T extends Fn, Cb extends Fn> = T & {
  before: (
    hook: (next: BeforeAsync<T, Cb>, ...args: RemoveLast<Parameters<T>>) => void
  ) => AsyncHookCallback<T, Cb>;
  after: (
    hook: (next: AfterAsync<Cb>, ...args: Parameters<Cb>) => void
  ) => SyncHook<T>;
};

export type AsyncHookNoCallback<T extends Fn> = T & {
  before: (
    hook: (next: BeforeAsyncNoCallback<T>, ...args: Parameters<T>) => void
  ) => AsyncHookNoCallback<T>;
};

export interface CreateHook {
  <T extends Fn>(fn: T): SyncHook<T>;
  <T extends Fn>(type: "sync", fn: T): SyncHook<T>;
  <T extends Fn>(type: "async", fn: T): LastParameter<T> extends Fn
    ? AsyncHookCallback<T, LastParameter<T>>
    : AsyncHookNoCallback<T>;
}

export interface HooksFactory {
  (config?: { useProxy?: boolean; ready?: number }): CreateHook;
  SYNC: 1;
  ASYNC: 2;
  QUEUE: 4;
}

declare const funHooks: HooksFactory;

export default funHooks;
