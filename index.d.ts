import { IncomingMessage, ServerResponse, ClientRequest } from 'http';
import * as Koa from 'koa';

// Preserve inference for existing options before considering the generic overload.
declare function KoaProxies(path: string | RegExp | (string | RegExp)[], options: KoaProxies.IKoaProxiesOptions): Koa.Middleware;
declare function KoaProxies<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext>(
  path: string | RegExp | (string | RegExp)[],
  options: KoaProxies.IKoaProxiesOptions<Parameters<Koa.Middleware<StateT, ContextT>>[0]>
): Koa.Middleware<StateT, ContextT>;

declare namespace KoaProxies {
  interface IBaseKoaProxiesOptions<FullContextT = Koa.Context> {
    target: string;
    changeOrigin?: boolean;
    logs?: boolean | ((ctx: FullContextT, target: string) => void);
    agent?: any;
    headers?: {[key: string]: string};
    rewrite?: (path: string) => string;
    events?: {
      error?: (error: any, req: IncomingMessage, res: ServerResponse) => void;
      proxyReq?: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => void;
      proxyRes?: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void;
    }
  }

  type IKoaProxiesOptionsFunc<FullContextT = Koa.Context> = (
    params: { [key: string]: string }, ctx: FullContextT
  ) => IBaseKoaProxiesOptions<FullContextT> | false;

  type IKoaProxiesOptions<FullContextT = Koa.Context> = string | IBaseKoaProxiesOptions<FullContextT> | IKoaProxiesOptionsFunc<FullContextT>;
}

export = KoaProxies;
