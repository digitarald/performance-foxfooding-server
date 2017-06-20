import React from 'react';
import Head from 'next/head';
import NoSSR from 'react-no-ssr';
import Link from 'next/link';
import { meta } from '../lib/metrics';
import apiFetch from '../lib/api-fetch';
import Metric from '../components/metric';
import reducers from '../lib/reducers';
import { parse } from '../lib/iterators/serializer';

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

    if (query.profile) {
      const id = query.profile;
      const profile = profiles && profiles.get(id);
      $content = (
        <div className="profile">
          <Link href="/"><a>◀ Back</a></Link>
          <h2>Firefox {profile.get('version')} on {profile.get('os')}</h2>
          <ul>
            {profile &&
              Array.from(meta.entries()).map(([metric, metricMeta]) => {
                const reducer = reducers.get(metricMeta.reducer);
                if (!reducer.prettyOne) {
                  return null;
                }
                const pretty = reducer.prettyOne(metric, metricMeta)(profile);
                console.log(pretty[1]);
                return (
                  <li key={`metric-${metric}`}>
                    {metricMeta.name}
                    <div className="value">
                      <em>{pretty[0]}</em> {pretty[1]}
                    </div>
                  </li>
                );
              })}
          </ul>
          <style jsx>{`
            .profile {
              margin: 1rem;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            a {
              text-decoration: none;
              color: blue;
              font-size: 1rem;
            }
            h2 {
              margin-bottom: 1rem;
            }
            ul {
              list-style: none;
            }
            li {
              display: flex;
              justify-content: space-between;
            }
            .value {
              margin-left: 2rem;
            }
            em {
              font-style: normal;
              font-size: 1.2rem;
              font-weight: bold;
            }
          `}</style>
        </div>
      );
    } else {
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
    }
    return (
      <div className="app">
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
            <em>
              {storage.size}, {report ? report.pending : '?'} queued for
              analysis
            </em>
          </aside>
        </header>
        <main>
          {$content}
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
