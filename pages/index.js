import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import { meta } from '../lib/metrics';
import reducers from '../lib/reducers';
import apiFetch from '../lib/api-fetch';
import { parse } from '../lib/iterators/serializer';

export default class Index extends React.Component {
  static async getInitialProps({ req }) {
    const storage = await apiFetch(req, '/storage');
    return { storage };
  }

  constructor(props) {
    super(props);
  }

  async componentDidMount() {
    console.log(this.props);
    const report = await apiFetch(null, '/');
    this.setState({ report });
  }

  render() {
    const { storage } = this.props;
    const { report } = this.state || {};
    // I want my Maps back
    const profiles = report ? parse(JSON.stringify(report.profiles)) : null;
    return (
      <div id="document">
        <Head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,700|Roboto:400,700"
          />
          <link rel="stylesheet" href="/static/index.css" />
        </Head>
        <header>
          <h1>
            {storage.profiles} Recordings from {storage.users} Foxfooders
          </h1>
          <aside>
            <em>{storage.size}, {report ? report.pending : '?'} queued for analysis</em>
          </aside>
          <dl>
            {Array.from(meta.entries()).map(([key, meta]) => {
              const reducer = reducers.get(meta.reducer || 'median');
              const $row = [<dt key={`${key}-dt`}>{meta.name}</dt>];
              if (profiles) {
                const reduced = reducer.pretty(profiles, key, meta);
                $row.push(<dd key={`${key}-dd`}>{reduced}</dd>);
              }
              return $row;
            })}
          </dl>
        </header>
        <main />
      </div>
    );
  }
}
