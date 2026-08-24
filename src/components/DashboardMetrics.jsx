import { getMetricChangeTone, sumShareChannels } from "../analyticsState";
import { EmptyState } from "./Commerce";

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "telegram", label: "Telegram" },
  { key: "copy_link", label: "Enlaces copiados" },
];

function formatMetricValue(value) {
  return new Intl.NumberFormat("es-AR").format(Number(value || 0));
}

function MetricKpi({ label, value, detail, tone }) {
  return (
    <article className={`metrics-kpi${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{formatMetricValue(value)}</strong>
      <p>{detail}</p>
    </article>
  );
}

function MetricGroup({ title, description, items }) {
  return (
    <section className="metrics-group">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <dl className="metrics-group-list">
        {items.map((item) => (
          <div key={item.label} className={item.featured ? "is-featured" : undefined}>
            <dt>{item.label}</dt>
            <dd>{formatMetricValue(item.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RankingHeader({ title, description }) {
  return (
    <header className="metrics-ranking-heading">
      <div>
        <p className="section-label">Rendimiento</p>
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
    </header>
  );
}

function ChannelBreakdown({ channels }) {
  return (
    <div className="metrics-ranking-channels" aria-label="Desglose por canal">
      {CHANNELS.map((channel) => (
        <span key={channel.key}>
          <small>{channel.label}</small>
          <strong>{formatMetricValue(channels?.[channel.key])}</strong>
        </span>
      ))}
    </div>
  );
}

function BookRanking({ books }) {
  return (
    <section className="metrics-ranking-section">
      <RankingHeader title="Libros con más interés" description="Ordenados por aperturas y consultas durante el período." />
      {books.length === 0 ? (
        <EmptyState title="Todavía no hay métricas">Cuando las personas interactúen con tu vidriera, vas a ver los libros con más interés acá.</EmptyState>
      ) : (
        <ol className="metrics-ranking-list">
          {books.map((book, index) => (
            <li key={book.id} className="metrics-ranking-item">
              <span className="metrics-ranking-position" aria-label={`Posición ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
              <div className="metrics-ranking-identity">
                <span>Libro #{book.id}</span>
                <h4>{book.title}</h4>
                <p>{book.author || "Autor no visible"}</p>
              </div>
              <dl className="metrics-ranking-primary">
                <div><dt>Aperturas</dt><dd>{formatMetricValue(book.book_detail_opened)}</dd></div>
                <div><dt>Consultas</dt><dd>{formatMetricValue(book.whatsapp_clicked)}</dd></div>
                <div><dt>Compartidos</dt><dd>{formatMetricValue(sumShareChannels(book.shares_by_channel))}</dd></div>
              </dl>
              <ChannelBreakdown channels={book.shares_by_channel} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ClubRanking({ clubs }) {
  if (clubs.length === 0) return null;

  return (
    <section className="metrics-ranking-section metrics-ranking-clubs">
      <RankingHeader title="Clubes más compartidos" description="Encuentros que más circularon entre lectores durante el período." />
      <ol className="metrics-ranking-list">
        {clubs.map((club, index) => (
          <li key={club.id} className="metrics-ranking-item metrics-ranking-club-item">
            <span className="metrics-ranking-position" aria-label={`Posición ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
            <div className="metrics-ranking-identity">
              <span>Club de lectura</span>
              <h4>{club.title}</h4>
            </div>
            <dl className="metrics-ranking-primary">
              <div><dt>Total compartidos</dt><dd>{formatMetricValue(sumShareChannels(club.shares_by_channel))}</dd></div>
            </dl>
            <ChannelBreakdown channels={club.shares_by_channel} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function DashboardMetrics({ analytics }) {
  const followerTone = getMetricChangeTone(analytics.follower_metrics.net_change);
  const distributionMetrics = [
    { label: "Libros compartidos", value: analytics.totals.book_shared, featured: true },
    { label: "Clubes compartidos", value: analytics.totals.reading_club_shared, featured: true },
    ...CHANNELS.map((channel) => ({ label: channel.label, value: analytics.share_channels?.[channel.key] })),
  ];
  const communityMetrics = [
    { label: "Seguidores activos", value: analytics.follower_metrics.active_followers, featured: true },
    { label: "Nuevos seguidores", value: analytics.follower_metrics.follows },
    { label: "Dejaron de seguir", value: analytics.follower_metrics.unfollows },
  ];

  return (
    <div className="metrics-dashboard">
      <section className="metrics-kpi-grid" aria-label="Resumen principal de métricas">
        <MetricKpi label="Aperturas de libros" value={analytics.totals.book_detail_opened} detail="Interés directo en tu catálogo" />
        <MetricKpi label="Visitas a la librería" value={analytics.totals.bookstore_opened} detail="Personas que abrieron tu vidriera" />
        <MetricKpi label="Clics en WhatsApp" value={analytics.totals.whatsapp_clicked} detail="Consultas iniciadas desde libros" />
        <MetricKpi label="Cambio neto" value={analytics.follower_metrics.net_change} detail="Altas menos bajas de seguidores" tone={followerTone} />
      </section>

      <div className="metrics-overview-grid">
        <MetricGroup title="Difusión" description="Cómo se compartieron tus libros y encuentros." items={distributionMetrics} />
        <MetricGroup title="Comunidad" description="Evolución de las personas que siguen tu librería." items={communityMetrics} />
      </div>

      <BookRanking books={analytics.top_books} />
      <ClubRanking clubs={analytics.top_reading_clubs} />
    </div>
  );
}
