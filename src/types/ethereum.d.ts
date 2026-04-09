type Eip1193RequestArgs = {
  method: string;
  params?: unknown[];
};

type Eip1193Provider = {
  request: (args: Eip1193RequestArgs) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export {};
