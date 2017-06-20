import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import Link from 'next/link';
import { meta } from '../lib/metrics';
import reducers from '../lib/reducers';
import { parse } from '../lib/iterators/serializer';
import apiFetch from '../lib/api-fetch';
import Metric from '../components/metric';
import Profile from '../components/profile';

export default class Index extends React.Component {
  static async getInitialProps({ req }) {
    const storage = await apiFetch(req, '/storage');
    return { storage };
  }

  constructor(props) {
    super(props);
    this.state = {
      highlight: null,
    };
  }

  async componentDidMount() {
    const report = await apiFetch(null, '/');
    const profiles = parse(JSON.stringify(report.profiles));
    delete report.profiles;
    this.setState({ report, profiles });
  }

  onMouseEnter(id) {
    this.setState({ highlight: id });
  }

  render() {
    const { storage, url } = this.props;
    const { query } = url;
    const { report, profiles, highlight } = this.state;
    let $content = null;
    let $dialog = null;

    if (query.profile && profiles) {
      const id = query.profile;
      const profile = profiles.get(id);
      $dialog = <Profile profile={profile} id={id} meta={meta} />;
    }
    const groups = Array.from(
      meta.entries()
    ).reduce((groups, [metric, metricMeta]) => {
      const bits = metric.split('-');
      if (bits.length > 1) {
        const group = bits[0];
        if (!groups.has(group)) {
          groups.set(group, new Map([[metric, metricMeta]]));
        } else {
          groups.get(group).set(metric, metricMeta);
        }
      }
      return groups;
    }, new Map());
    $content = Array.from(groups).map(([group, groupMetrics]) => {
      const $metrics = Array.from(
        groupMetrics.entries()
      ).map(([metric, metricMeta]) => {
        const $metric = (
          <Metric
            key={`metric-${metric}`}
            id={metric}
            meta={metricMeta}
            profiles={profiles}
            highlight={highlight}
            onMouseEnter={this.onMouseEnter.bind(this)}
          />
        );
        return $metric;
      });
      return (
        <section className="group" key={group}>
          <h2>{group}</h2>
          <div className="metrics">{$metrics}</div>
          <style jsx>{`
            section {
            }
            h2 {
              text-transform: capitalize;
              background-color: #555;
              color: #fff;
              text-align: center;
            }
            .metrics {
            }
          `}</style>
        </section>
      );
    });

    return (
      <div className="app">
        <Head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,700|Roboto:400,700"
          />
          <link rel="stylesheet" href="/static/index.css" />
          <title>Performance Foxfooding</title>
        </Head>
        <header>
          <h1>
            {storage.profiles} Recordings from {storage.users} Foxfooders
          </h1>
          <aside>
            <em>
              {storage.size}, {report ? report.pending : '?'} queued for
              analysis
            </em>
          </aside>
        </header>
        <main>
          {$content}
          {$dialog}
        </main>
        <style jsx>{`
          .app {
          }
          header {
            background-color: #333;
            color: #fff;
            display: flex;
            align-items: center;
            padding: 1rem;
          }
          h1 {
            flex: 1;
          }
          main {
          }
        `}</style>
      </div>
    );
  }
}
