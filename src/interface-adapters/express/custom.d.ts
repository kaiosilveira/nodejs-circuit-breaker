declare namespace Express {
  export type RequestContext = {
    url: string;
    method: string;
    reqStartedAt: number;
  };

  export interface Request {
    context?: RequestContext;
  }
}
