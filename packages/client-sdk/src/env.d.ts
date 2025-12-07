declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    API_URL?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
