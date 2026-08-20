import assert from "node:assert/strict";
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

  test("renders complete public author book cards and hides the empty section", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderAuthorBooks } = await vite.ssrLoadModule("/src/components/ReaderPublicProfile.jsx");
      const reader = { display_name: "Ana Borges" };
      const emptyMarkup = renderToStaticMarkup(createElement(ReaderAuthorBooks, { reader, books: [] }));
      const markup = renderToStaticMarkup(createElement(ReaderAuthorBooks, {
        reader,
        books: [{ title: "La casa del viento", synopsis: "Una novela sobre memoria.", genre: { id: 3, name: "Novela" }, publisher: "Ediciones Sur", publication_year: 2026, cover_url: "/readers/ana/author-books/7/cover" }],
      }));

      assert.equal(emptyMarkup, "");
      assert.match(markup, /Libros de Ana Borges/);
      assert.match(markup, /La casa del viento/);
      assert.match(markup, /Una novela sobre memoria/);
      assert.match(markup, /Novela/);
      assert.match(markup, /Ediciones Sur/);
      assert.match(markup, /2026/);
      assert.match(markup, /\/readers\/ana\/author-books\/7\/cover/);
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

  test("renders public followed bookstores and hides the empty section", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const { ReaderFollowedBookstores } = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const reader = { display_name: "Gabriel" };
      const emptyMarkup = renderToStaticMarkup(createElement(ReaderFollowedBookstores, { reader, bookstores: [] }));
      const markup = renderToStaticMarkup(createElement(ReaderFollowedBookstores, {
        reader,
        bookstores: [{ id: 8, name: "Naranja de Papel", slug: "naranja-de-papel", logo_url: "https://example.com/logo.png", address: "Corrientes 1234" }],
      }));

      assert.equal(emptyMarkup, "");
      assert.match(markup, /Librerías que sigue Gabriel/);
      assert.match(markup, /href="\/bookstores\/naranja-de-papel"/);
      assert.match(markup, /Naranja de Papel/);
      assert.match(markup, /Corrientes 1234/);
      assert.match(markup, /https:\/\/example.com\/logo.png/);
    } finally {
      await vite.close();
    }
  });
}
