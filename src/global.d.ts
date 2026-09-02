declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STEPIK_CLIENT_ID: string;
      STEPIK_CLIENT_SECRET: string;
      STEPIK_COURSES: string;
    }
  }
}

export {};
