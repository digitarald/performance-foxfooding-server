import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import Link from 'next/link';
import { meta } from '../lib/metrics';
import reducers from '../lib/reducers';
import { parse } from '../lib/iterators/serializer';
import apiFetch from '../lib/api-fetch';
import Metrics from '../components/metrics';
import Profile from '../components/profile';

export default class Index extends React.Component {
  static async getInitialProps({ req }) {
    const stats = await apiFetch('/stats', {}, req);
    return { stats };
  }

  constructor(props) {
    super(props);
    this.state = {
      highlight: null,
    };
  }

  async componentDidMount() {
    const report = await apiFetch('/');
    const profiles = parse(JSON.stringify(report.profiles));
    delete report.profiles;
    this.setState({ report, profiles });
  }

  onMouseEnter = id => {
    this.setState({ highlight: id });
  };

  render() {
    const { stats, url } = this.props;
    const { query } = url;
    const { report, profiles, highlight } = this.state;
    let $metrics = null;
    let $dialog = null;

    if (query.profile && profiles) {
      const id = query.profile;
      console.log(Array);
      const profile = profiles.get(id);
      $dialog = <Profile profile={profile} id={id} meta={meta} />;
    }
    $metrics = (
      <Metrics
        onMouseEnter={this.onMouseEnter}
        highlight={highlight}
        profiles={profiles}
      />
    );

    return (
      <div className="app">
        <Head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,700|Roboto:400,700"
          />
          <title>Performance Foxfooding</title>
        </Head>
        <header>
          <h1>
            {stats.profiles} Recordings from {stats.users} Foxfooders
          </h1>
          <aside>
            <em>
              {stats.size}, {report ? report.pending : '?'} queued for
              analysis
            </em>
          </aside>
        </header>
        <main>
          {$metrics}
          {$dialog}
        </main>
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            font-size: 1em;
          }
          html {
            font-family: 'Roboto', sans-serif;
            font-size: 1em;
          }
          body {
            line-height: 1.45;
            color: #333;
            background-color: #eee;
          }
          a, a:visited {
            color: #005189;
            text-decoration: underline;
          }
        `}</style>
        <style jsx>{`
          header {
            background-color: #ddd;
            color: #333;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            padding: 1rem;
          }
          h1 {
            flex: 1;
            font-weight: 300;
            font-size: 1.2rem;
          }
        `}</style>
      </div>
    );
  }
}
