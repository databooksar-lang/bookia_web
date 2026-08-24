import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function registerProgressiveReaderAuthIntegrationTests(test) {
  test("captures visitor favorite and follow intents without blocking discovery contact actions", () => {
    const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

    assert.match(source, /startReaderIntent\("favorite_book"/);
    assert.match(source, /startReaderIntent\("follow_bookstore"/);
    assert.match(source, /buildRegisterPath\(\{ profileType: "reader" \}\)/);
    assert.match(source, /reader_intent_started/);
    assert.match(source, /trackReaderFunnelEvent/);
    assert.match(source, /dashboard\/favorites\/bookstores\/\$\{bookstore\.id\}/);
    assert.match(source, />\{isFollowing \? "Dejar de seguir" : "Seguir"\}</);
    assert.match(source, /<WhatsAppButton/);
  });

  test("coordinates post-auth pending actions and exposes success or retry feedback", () => {
    const source = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

    assert.match(source, /completePendingReaderAuthentication/);
    assert.match(source, /applyPendingReaderAction/);
    assert.match(source, /retryPendingReaderAction/);
    assert.match(source, /role=\{readerActionFeedback\.kind === "error" \? "alert" : "status"\}/);
    assert.match(source, /onAuthenticated=\{completeReaderAuthentication\}/);
  });

  test("keeps contextual auth copy and visually prioritizes Google", () => {
    const auth = readFileSync(new URL("../src/pages/AuthPages.jsx", import.meta.url), "utf8");
    const register = readFileSync(new URL("../src/pages/RegisterPage.jsx", import.meta.url), "utf8");
    const ownerLinkForm = auth.slice(auth.indexOf("function GoogleOwnerLinkForm"), auth.indexOf("export function LoginPage"));

    assert.match(auth, /getPendingReaderActionCopy/);
    assert.match(auth, /reader_auth_started/);
    assert.match(auth, /getGoogleOAuthCallback/);
    assert.match(auth, /googleHandledRef/);
    assert.match(auth, /export function LoginPage[\s\S]*const googleHandledRef = useRef\(false\);[\s\S]*useEffect\(/);
    assert.doesNotMatch(ownerLinkForm, /googleHandledRef/);
    assert.match(auth, /params\.delete\("google"\)/);
    assert.doesNotMatch(auth, /markGoogleReaderRegistration|consumeGoogleReaderRegistration/);
    assert.doesNotMatch(readFileSync(new URL("../src/pendingReaderAction.js", import.meta.url), "utf8"), /GOOGLE_READER_REGISTRATION_KEY|markGoogleReaderRegistration|consumeGoogleReaderRegistration/);
    assert.match(auth, /reader-auth-google/);
    assert.match(register, /getPendingReaderActionCopy/);
    assert.match(register, /reader_registration_completed|onAuthenticated/);
    assert.match(register, /reader-auth-email/);
  });

  test("shows followed bookstores in the reader profile and follower totals in metrics", () => {
    const reader = readFileSync(new URL("../src/pages/ReaderProfilePage.jsx", import.meta.url), "utf8");
    const dashboardMetrics = readFileSync(new URL("../src/components/DashboardMetrics.jsx", import.meta.url), "utf8");

    assert.match(reader, /onBookstores:\s*setFollowedBookstores/);
    assert.match(reader, /Librer.as seguidas/);
    assert.match(reader, /resolveApiUrl\(bookstore\.logo_url\)/);
    assert.match(reader, /dashboard\/favorites\/bookstores\/\$\{bookstoreId\}/);
    assert.match(dashboardMetrics, /Seguidores activos/);
    assert.match(dashboardMetrics, /Nuevos seguidores/);
    assert.match(dashboardMetrics, /Dejaron de seguir/);
    assert.match(dashboardMetrics, /Cambio neto/);
  });

  test("styles progressive reader actions accessibly at desktop and mobile sizes", () => {
    const styles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(styles, /\.bookstore-follow-button\s*\{/);
    assert.match(styles, /\.reader-action-feedback\s*\{/);
    assert.match(styles, /\.reader-followed-bookstores\s*\{/);
    assert.match(styles, /\.reader-auth-google\s*\{/);
    assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.reader-followed-bookstore/s);
    assert.match(styles, /:focus-visible/);
  });
}
