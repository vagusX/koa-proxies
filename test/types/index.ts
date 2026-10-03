import proxy = require('../..');
import defaultProxy from '../..';
import Koa = require('koa');

// Existing imports, public option aliases and bypass callbacks stay valid.
const baseOptions: proxy.IBaseKoaProxiesOptions = { target: 'http://localhost:8000' };
const optionsFunction: proxy.IKoaProxiesOptionsFunc = () => false;
const options: proxy.IKoaProxiesOptions = baseOptions;
const middleware: Koa.Middleware = proxy('/api', options);
proxy('/api', optionsFunction);
proxy('/api', () => false);
defaultProxy('/api', baseOptions);
proxy('/api', {
  target: 'http://localhost:8000',
  logs: ctx => { const method: string = ctx.method; }
});

interface State { userId: string }
interface Context { tenant: string }

const typedMiddleware = proxy<State, Context>('/api/:id', (params, ctx) => {
  const id: string = params.id;
  const userId: string = ctx.state.userId;
  const tenant: string = ctx.tenant;
  // @ts-expect-error Custom state fields must retain their declared types.
  ctx.state.userId.toFixed(2);
  // @ts-expect-error Misspelled state fields must be rejected.
  ctx.state.userID;
  // @ts-expect-error Custom context fields must retain their declared types.
  ctx.tenant.toFixed(2);
  if (!id) return false;
  return {
    target: 'http://localhost:8000/' + tenant + '/' + userId,
    logs: logContext => {
      const loggedUser: string = logContext.state.userId;
      const loggedTenant: string = logContext.tenant;
      // @ts-expect-error Log callbacks must receive the custom context too.
      logContext.state.userId.toFixed(2);
    }
  };
});
const typedApp = new Koa<State, Context>();
typedApp.use(typedMiddleware);
typedApp.use(middleware);

proxy<State, Context>('/api', {
  target: 'http://localhost:8000',
  logs: ctx => {
    const tenant: string = ctx.tenant;
    // @ts-expect-error Object-form options also receive the custom state.
    ctx.state.userId.toFixed(2);
  }
});

type TypedContext = Parameters<Koa.Middleware<State, Context>>[0];
const typedBase: proxy.IBaseKoaProxiesOptions<TypedContext> = {
  target: 'http://localhost:8000',
  logs: ctx => { const id: string = ctx.state.userId; }
};
const typedFunction: proxy.IKoaProxiesOptionsFunc<TypedContext> = () => false;
const typedOptions: proxy.IKoaProxiesOptions<TypedContext> = typedBase;
proxy<State, Context>('/api', typedOptions);
proxy<State, Context>('/api', typedFunction);
