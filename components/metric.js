import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import { meta } from '../lib/metrics';
import reducers from '../lib/reducers';
import apiFetch from '../lib/api-fetch';

export default class extends React.Component {
  static async getInitialProps({ req }) {
    const data = await apiFetch(req, '/');
    return { data };
  }

  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const data = await apiFetch(req, '/');
    this.setState({ data });
  }

  render() {
    const { data } = this.props;
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
          <h1>Performance Foxfooding</h1>
          <ul>
            {Array.from(meta.entries()).map(([key, meta]) => {
              return <li key={key}>{meta.name}</li>;
            })}
          </ul>
        </header>
        <main />
      </div>
    );
  }
}
