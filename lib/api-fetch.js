export default async (req, path, init = {}) => {
  init.url = path;
  if (!init.method) {
    init.method = 'get';
  }
  if (!req) {
    input.url = `/report${input.url}`;
    return await (await fetch(input)).json();
  }
  try {
    const data = await new Promise(resolve => {
      req.app.get('report').handle(init, { json: resolve }, () => {});
    });
    return data;
  } catch (err) {
    return null;
  }
};
