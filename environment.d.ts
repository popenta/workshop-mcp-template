declare global {
    namespace NodeJS {
      interface ProcessEnv {
        MVX_WALLET: string;
        MVX_WALLET_PASSWORD: string;
      }
    }
}

export { };
