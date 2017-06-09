import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import { meta } from '../lib/metrics';
import reducers from '../lib/reducers';
import apiFetch from '../lib/api-fetch';
import { parse } from '../lib/iterators/serializer';

console.log(reducers);

export default class extends React.Component {
  static async getInitialProps({ req }) {
    const storage = await apiFetch(req, '/storage');
    return { storage };
  }

  constructor(props) {
    super(props);
  }

  async componentDidMount() {
    console.log(this.props);
    const data = await apiFetch(null, '/');
    this.setState({ data });
  }

  render() {
    const { storage } = this.props;
    const { data } = this.state || {};
    // I want my Maps back
    const mapped = parse(JSON.stringify(data || {}));
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
          <h1>{storage.profiles} Recordings from {storage.users} Foxfooders ({storage.size})</h1>
          <dl>
            {Array.from(meta.entries()).map(([key, meta]) => {
              const reducer = reducers.get(meta.reducer || 'median');
              const $row = [<dt key={`${key}-dt`}>{meta.name}</dt>];
              if (mapped.size) {
                const reduced = reducer.reduce(key, meta)(mapped);
                $row.push(<dd key={`${key}-dd`}>{reducer.print(reduced, meta)}</dd>);
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
