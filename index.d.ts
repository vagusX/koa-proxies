import { IncomingMessage, ServerResponse, ClientRequest } from 'http';
import * as Koa from 'koa';

declare function KoaProxies(path: string | RegExp | (string | RegExp)[], options: KoaProxies.IKoaProxiesOptions): Koa.Middleware;

declare namespace KoaProxies {
  interface IBaseKoaProxiesOptions {
    target: string;
    changeOrigin?: boolean;
    logs?: boolean | ((ctx: Koa.Context, target: string) => void);
    agent?: any;
    headers?: {[key: string]: string};
    rewrite?: (path: string) => string;
    events?: {
      error?: (error: any, req: IncomingMessage, res: ServerResponse) => void;
      proxyReq?: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => void;
      proxyRes?: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void;
    }
  }

  type IKoaProxiesOptionsFunc = (params: { [key: string]: string }, ctx: Koa.Context) => IBaseKoaProxiesOptions | false;

  type IKoaProxiesOptions = string | IBaseKoaProxiesOptions | IKoaProxiesOptionsFunc;
}

export = KoaProxies;
