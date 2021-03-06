import { stringify } from './iterators/serializer';

export default async (path, init = {}, req) => {
  init.url = path;
  if (!init.method) {
    init.method = 'get';
  }
  if (!req) {
    init.url = `/api/report${init.url}`;
    return await (await fetch(init.url, { credentials: 'same-origin' })).json();
  }
  init.app = req.app;
  const data = await new Promise(resolve => {
    req.app.get('report').handle(init, { json: resolve }, () => {});
  }).catch(err => console.error('api-fetch', init, err));
  return JSON.parse(stringify(data));
};
