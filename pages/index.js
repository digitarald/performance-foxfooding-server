import React from 'react';
import Head from 'next/head';
import apiFetch from '../lib/api-fetch';

export default class extends React.Component {
  static async getInitialProps({ req }) {
    const { profiles } = await apiFetch(req, '/storage');
    return { profiles };
  }

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { profiles } = this.props;
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
          {profiles
            ? <ul>
                {profiles.map(entry => {
                  return <li key={entry.key}>{entry.key}</li>;
                })}
              </ul>
            : 'Loading …'}
        </header>
        <main />
      </div>
    );
  }
}
