import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

export function registerReaderPublicProfileRenderTests(test) {
  test("renders public social links with platform labels and hardened external targets", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderSocialLinks } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const markup = renderToStaticMarkup(createElement(ReaderSocialLinks, { links: [
        { platform: "instagram", url: "https://www.instagram.com/ana.lee" },
        { platform: "goodreads", url: "https://www.goodreads.com/ana-lee" },
      ] }));

      assert.match(markup, /href="https:\/\/www\.instagram\.com\/ana\.lee"/);
      assert.match(markup, /aria-label="Instagram de este lector"/);
      assert.match(markup, /Goodreads/);
      assert.match(markup, /target="_blank"/);
      assert.match(markup, /rel="noopener noreferrer"/);
      assert.equal(renderToStaticMarkup(createElement(ReaderSocialLinks, { links: [] })), "");
    } finally {
      await vite.close();
    }
  });
  test("renders the public monogram independently from passport traits", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderMonogram, ReaderPassport } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const markup = renderToStaticMarkup(createElement(ReaderPassport, { reader: {
        display_name: "Ana Borges",
        traits: { how_i_read: ["multiple_at_once"], what_i_seek: ["companionship"], book_relationship: ["love_recommending"] },
      } }));

      assert.match(renderToStaticMarkup(createElement(ReaderMonogram, { displayName: "Ana Borges", className: "is-profile-hero" })), />AB</);
      assert.match(markup, /class="reader-passport reader-passport-book"/);
      assert.match(markup, /Pasaporte lector/);
      assert.match(markup, /Siempre tengo varios abiertos/);
      assert.match(markup, /Una historia que acompañe/);
      assert.match(markup, /Me encanta recomendar/);
      assert.equal(renderToStaticMarkup(createElement(ReaderPassport, { reader: { display_name: "Ana", traits: {} } })), "");
    } finally {
      await vite.close();
    }
  });

  test("renders a compact public wanted-books preview without an empty section", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderWantedBooksPublic } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const items = [1, 2, 3, 4].map((id) => ({ title: `Libro ${id}`, author: id === 1 ? "Autora" : "", details: id === 1 ? "Edición ilustrada" : "" }));
      const markup = renderToStaticMarkup(createElement(ReaderWantedBooksPublic, { items }));

      assert.match(markup, /Libros que estoy buscando/);
      assert.match(markup, /Libro 1/);
      assert.match(markup, /Edición ilustrada/);
      assert.match(markup, /Libro 3/);
      assert.doesNotMatch(markup, /Libro 4/);
      assert.match(markup, /Ver lista completa/);
      assert.equal(renderToStaticMarkup(createElement(ReaderWantedBooksPublic, { items: [] })), "");
    } finally {
      await vite.close();
    }
  });

  test("renders public author book detail and share actions and hides the empty section", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderAuthorBooks, ReaderAuthorBookDetailModal } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const reader = { display_name: "Ana Borges", slug: "ana-borges" };
      const emptyMarkup = renderToStaticMarkup(createElement(ReaderAuthorBooks, { reader, books: [] }));
      const markup = renderToStaticMarkup(createElement(ReaderAuthorBooks, {
        reader,
        books: [{ id: 7, title: "La casa del viento", synopsis: "Una novela sobre memoria.", genre: { id: 3, name: "Novela" }, publisher: "Ediciones Sur", publication_year: 2026, cover_url: "/readers/ana/author-books/7/cover" }],
      }));
      const detailMarkup = renderToStaticMarkup(createElement(ReaderAuthorBookDetailModal, { reader, book: { id: 7, title: "La casa del viento", synopsis: "Una novela sobre memoria.", genre: { name: "Novela" }, publisher: "Ediciones Sur", publication_year: 2026, cover_url: "/readers/ana/author-books/7/cover" }, onClose() {} }));

      assert.equal(emptyMarkup, "");
      assert.match(markup, /Libros de Ana Borges/);
      assert.match(markup, /La casa del viento/);
      assert.match(markup, /Una novela sobre memoria/);
      assert.match(markup, /Novela/);
      assert.match(markup, /Ediciones Sur/);
      assert.match(markup, /2026/);
      assert.match(markup, /\/readers\/ana\/author-books\/7\/cover/);
      assert.match(markup, /Ver detalles de La casa del viento/);
      assert.match(markup, /aria-label="Compartir"/);
      assert.match(detailMarkup, /role="dialog"/);
      assert.match(detailMarkup, /Sinopsis/);
    } finally {
      await vite.close();
    }
  });

  test("hides empty reader clubs and renders accented club copy when clubs exist", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderReadingClubs } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const reader = { display_name: "Gabriel" };
      const emptyMarkup = renderToStaticMarkup(createElement(ReaderReadingClubs, { reader, readingClubs: [], onBack: () => {} }));
      const clubMarkup = renderToStaticMarkup(createElement(ReaderReadingClubs, {
        reader,
        sharedClubId: 7,
        readingClubs: [{ id: 7, title: "Lecturas del mes", description: "Una charla", genre: null, meeting_date: "2026-08-20", location: "Sala 1" }],
        onBack: () => {},
      }));

      assert.equal(emptyMarkup, "");
      assert.match(clubMarkup, /Encuentros de Gabriel/);
      assert.match(clubMarkup, /Género del club/);
      assert.match(clubMarkup, /Sin género/);
      assert.match(clubMarkup, /id="club-7"/);
      assert.match(clubMarkup, /reading-club-public-card is-shared-club/);
      assert.doesNotMatch(clubMarkup, /\\u00/);
    } finally {
      await vite.close();
    }
  });

  test("renders an optional cover and compact action area for a public reading club", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReadingClubPublicCard, hideBrokenReadingClubCover } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const club = {
        id: 7,
        title: "Lecturas del mes",
        description: "Una conversación extensa para probar la composición pública del club.",
        cover_url: "/reading-clubs/7/cover",
        genre: { name: "Narrativa" },
        meeting_date: "2026-08-20",
        location: "Sala 1",
        external_url: "https://example.com/club",
      };
      const withCover = renderToStaticMarkup(createElement(ReadingClubPublicCard, { club, showShare: false }));
      const withoutCover = renderToStaticMarkup(createElement(ReadingClubPublicCard, { club: { ...club, cover_url: null }, showShare: false }));

      assert.match(withCover, /reading-club-public-card-content/);
      assert.match(withCover, /reading-club-public-cover/);
      assert.match(withCover, /reading-club-public-genre/);
      assert.match(withCover, /reading-club-public-title/);
      assert.match(withCover, /reading-club-public-description/);
      assert.match(withCover, /reading-club-public-actions/);
      assert.match(withCover, /Ver más sobre este encuentro/);
      assert.match(withCover, /\/reading-clubs\/7\/cover/);
      assert.doesNotMatch(withoutCover, /reading-club-public-cover/);

      const brokenCover = { hidden: false };
      hideBrokenReadingClubCover({ currentTarget: brokenCover });
      assert.equal(brokenCover.hidden, true);
    } finally {
      await vite.close();
    }
  });

  test("places the reading-club share trigger before the card content for top-right positioning", async () => {
    const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    const shareTrigger = source.indexOf("{showShare ? <ReadingClubShareMenu");
    const cardContent = source.indexOf("{onOpenDetails ? <button type=\"button\" className=\"reading-club-public-card-content");
    const actionRow = source.indexOf("{onOpenDetails || hostPath || showShare || hasExternalLink ? <div className=\"reading-club-public-actions\"");

    assert.ok(shareTrigger >= 0);
    assert.ok(shareTrigger < cardContent);
    assert.ok(shareTrigger < actionRow);
  });

  test("opens reading-club details from a search card without navigating to the host profile", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReadingClubDetailModal, ReadingClubPublicCard } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const club = {
        id: 7,
        title: "Lecturas del mes",
        description: "Una descripción completa que debe leerse sin el truncado de la tarjeta pública.",
        cover_url: "/reading-clubs/7/cover",
        genre: { name: "Narrativa" },
        meeting_date: "2026-08-20",
        location: "Sala 1",
        external_url: "https://example.com/club",
      };
      const host = { type: "reader", slug: "gabriel", display_name: "Gabriel" };
      const cardMarkup = renderToStaticMarkup(createElement(ReadingClubPublicCard, { club, host, hostPath: "/readers/gabriel", onOpenDetails: () => {}, onOpenInterest: () => {}, showInterest: true, hideExternalLink: true }));
      const modalMarkup = renderToStaticMarkup(createElement(ReadingClubDetailModal, { selectedClub: club, host, hostPath: "/readers/gabriel", onClose: () => {} }));

      assert.match(cardMarkup, /type="button"/);
      assert.match(cardMarkup, /aria-label="Ver detalles de Lecturas del mes"/);
      assert.match(cardMarkup, /href="\/readers\/gabriel"/);
      assert.match(cardMarkup, /class="secondary-button reading-club-card-action" href="https:\/\/example\.com\/club" target="_blank" rel="noopener noreferrer">\+ info<\/a>/);
      assert.match(cardMarkup, /Estoy interesado@/);
      assert.doesNotMatch(cardMarkup, /Ver más sobre este encuentro/);
      assert.match(modalMarkup, /role="dialog"/);
      assert.match(modalMarkup, /Una descripción completa que debe leerse sin el truncado de la tarjeta pública\./);
      assert.doesNotMatch(modalMarkup, /href="\/readers\/gabriel"/);
      assert.doesNotMatch(modalMarkup, /Ver perfil/);
      assert.doesNotMatch(modalMarkup, /Ver más sobre este encuentro/);
      assert.doesNotMatch(modalMarkup, /Estoy interesado@/);
      assert.doesNotMatch(modalMarkup, /Estoy interesado\/a en anotarme/);
      assert.equal(renderToStaticMarkup(createElement(ReadingClubDetailModal, { selectedClub: null, onClose: () => {} })), "");
    } finally {
      await vite.close();
    }
  });

  test("keeps reading-club details and host profile actions visible in search", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReadingClubDetailModal, ReadingClubPublicCard } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const club = { id: 8, title: "Club visible", description: "Una descripción completa.", genre: { name: "Clásicos" }, meeting_date: "2026-09-01", location: "Online", external_url: "https://example.com/club-visible" };
      const host = { type: "reader", slug: "belen", display_name: "Belén" };
      const cardMarkup = renderToStaticMarkup(createElement(ReadingClubPublicCard, { club, host, hostPath: "/readers/belen", onOpenDetails: () => {}, onOpenInterest: () => {}, showInterest: true, hideExternalLink: true }));
      const modalMarkup = renderToStaticMarkup(createElement(ReadingClubDetailModal, { selectedClub: club, host, hostPath: "/readers/belen", onClose: () => {} }));

      assert.match(cardMarkup, /class="secondary-button reading-club-card-action" href="https:\/\/example\.com\/club-visible" target="_blank" rel="noopener noreferrer">\+ info<\/a>/);
      assert.doesNotMatch(cardMarkup, /Ver más info/);
      assert.match(cardMarkup, /Ver perfil/);
      assert.doesNotMatch(cardMarkup, /Ver perfil de lectora/);
      assert.match(cardMarkup, /href="\/readers\/belen"/);
      assert.match(cardMarkup, /Estoy interesado@/);
      assert.ok(cardMarkup.indexOf(">Ver perfil</a>") < cardMarkup.indexOf(">+ info</a>"));
      assert.ok(cardMarkup.indexOf(">+ info</a>") < cardMarkup.indexOf(">Estoy interesado@</button>"));
      assert.doesNotMatch(modalMarkup, /href="\/readers\/belen"/);
      assert.doesNotMatch(modalMarkup, /Ver perfil/);
      assert.doesNotMatch(modalMarkup, /Estoy interesado@/);
      assert.doesNotMatch(modalMarkup, /Estoy interesado\/a en anotarme/);
    } finally {
      await vite.close();
    }
  });

  test("does not render readers' followed bookstores on public profiles", () => {
    const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
    assert.doesNotMatch(source, /followed_bookstores/);
    assert.doesNotMatch(source, /ReaderFollowedBookstores/);
  });
}
