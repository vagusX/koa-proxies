import type {IncomingMessage, ServerResponse, ClientRequest} from 'http';

import type * as Koa from 'koa';

declare module 'koa-proxies' {
  function KoaProxies<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext, ResponseBodyT = unknown>(
    path: Array<RegExp | string> | RegExp | string,
    options: KoaProxies.IKoaProxiesOptions<Koa.ParameterizedContext<StateT, ContextT, ResponseBodyT>>,
  ): Koa.Middleware<StateT, ContextT, ResponseBodyT>;

  namespace KoaProxies {
    interface IBaseKoaProxiesOptions<ContextT> {
      target: string;
      changeOrigin?: boolean;
      logs?: boolean | ((ctx: ContextT, target: string) => void);
      agent?: unknown;
      headers?: Record<string, string>;
      rewrite?: (path: string) => string;
      events?: {
        error?: (error: unknown, req: IncomingMessage, res: ServerResponse) => void;
        proxyReq?: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => void;
        proxyRes?: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void;
      };
    }

    type IKoaProxiesOptionsFunc<ContextT> = (
      params: Record<string, string>,
      ctx: ContextT,
    ) => IBaseKoaProxiesOptions<ContextT>;

    type IKoaProxiesOptions<ContextT> = IBaseKoaProxiesOptions<ContextT> | IKoaProxiesOptionsFunc<ContextT> | string;
  }

  export default KoaProxies;
}
