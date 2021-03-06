const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const { parse } = require('url');
const compression = require('compression');
const next = require('next');
const shortid = require('shortid');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
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
  if (!dev) {
    server.use((req, res, next) => {
      // https://developer.mozilla.org/en-US/docs/Web/Security/HTTP_strict_transport_security
      res.header('Strict-Transport-Security', 'max-age=15768000');
      // https://github.com/rangle/force-ssl-heroku/blob/master/force-ssl-heroku.js
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.get('Host')}${req.url}`);
      }
      return next();
    });
    server.set('trust proxy', true);
    server.use(compression());
  }

  server.get('/robots.txt', (req, res) => {
    res.sendFile('static/robots.txt', { root: __dirname });
  });
  server.get('/xpi', (req, res) => {
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

  server.use(bodyParser.json());
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

  server.set('json replacer', replacer);
  server.set('redis', client);
  server.set('collect', collect);
  server.set('report', report);

  server.use('/api/collect', collect);

  const strategy = new Auth0Strategy(
    {
      callbackURL: '/report/',
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
    },
    (accessToken, refreshToken, extraParams, profile, done) =>
      done(null, profile)
  );
  passport.use(strategy);
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  server.use(cookieParser());
  server.use(
    session({
      store: new RedisStore({ url: process.env.REDIS_URL }),
      secret: process.env.SESSION_SECRET || shortid.generate(),
      resave: false,
      key: 'sid',
      cookie: {
        httpOnly: true,
        maxAge: 60000 * 60 * 24 * 7,
        secure: !dev,
      },
      saveUninitialized: true,
    })
  );
  server.use(passport.initialize());
  server.use(passport.session());

  server.get(
    '/report/',
    passport.authenticate('auth0', {
      connection: 'google-oauth2',
      failureRedirect: '/report/error',
    }),
    (req, res) => {
      const domains = (process.env.DOMAINS || 'mozilla.com').split(',');
      if (!req.user) {
        throw new Error('user null');
      }
      if (
        !req.user.emails.some(({ value }) =>
          domains.includes(value.split('@')[1])
        )
      ) {
        throw new Error('domain mismatch');
      }
      res.redirect('/');
    }
  );
  server.get('/report/logout', function(req, res) {
    req.session.destroy(function(err) {
      res.redirect('/');
    });
  });
  server.get('/report/error', (req, res) => res.sendStatus(403));

  const ensureAuth = (req, res, next) => {
    if (!req.isAuthenticated() && !dev) {
      return res.redirect('/report/');
    }
    next();
  };

  server.use('/api/report', ensureAuth, report);
  server.get('*', ensureAuth, (req, res) => {
    handle(req, res, parse(req.url, true));
  });
  server.listen(process.env.PORT || 3000);
});
