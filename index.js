const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const { parse } = require('url');
const compression = require('compression');
const next = require('next');
const { replacer } = require('./lib/iterators/serializer');
require('dotenv').config();

const client = require('then-redis').createClient(process.env.REDIS_URL);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev });
const handle = app.getRequestHandler();
const collect = require('./api/collect');
const report = require('./api/report');

app.prepare().then(() => {
  const server = express();
  server.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      // https://developer.mozilla.org/en-US/docs/Web/Security/HTTP_strict_transport_security
      res.header('Strict-Transport-Security', 'max-age=15768000');
      // https://github.com/rangle/force-ssl-heroku/blob/master/force-ssl-heroku.js
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.get('Host')}${req.url}`);
      }
    }
    return next();
  });
  server.use(compression());
  server.use(bodyParser.json());
  server.set('json replacer', replacer);
  server.set('redis', client);
  server.set('collect', collect);
  server.set('report', report);

  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  server
    .get('/robots.txt', (req, res) => {
      res.sendFile('static/robots.txt', { root: __dirname });
    })
    .get('/xpi', (req, res) => {
      request(process.env.XPI_URL)
        .on('response', res => {
          res.headers['content-type'] = 'application/x-xpinstall';
        })
        .on('error', function(err) {
          console.error('Could not pipe XPI', err);
          res.sendStatus(500);
        })
        .pipe(res);
    });
  server.use('/api/collect', collect);
  server.use('/api/report', report);
  server.get('*', (req, res) => handle(req, res, parse(req.url, true)));
  server.listen(process.env.PORT || 3000);
});
