import es from "../i18n/locales/es.json";
import en from "../i18n/locales/en.json";

export type Lang = "en" | "es";

const DEFAULT_LANG: Lang = "es";
const DICTS: Record<Lang, Record<string, unknown>> = {es, en};

/**
 * Normalizes an arbitrary lang value (e.g. i18next's `i18n.language`,
 * which can be "en-US") down to a supported Lang, defaulting to
 * Spanish for anything missing or unrecognized.
 * @param {string | undefined | null} raw Raw lang value from the client.
 * @return {Lang} A supported language code.
 */
export function resolveLang(raw: string | undefined | null): Lang {
  const code = (raw ?? "").slice(0, 2).toLowerCase();
  return code === "en" ? "en" : DEFAULT_LANG;
}

/**
 * Looks up a dot-path key (e.g. "competition.team.label") in the given
 * language's dictionary, falling back to Spanish if missing, and
 * interpolates {placeholders} from params.
 * @param {Lang} lang Language to look up.
 * @param {string} key Dot-separated key path.
 * @param {Record<string, string | number>} params Interpolation values.
 * @return {string} The resolved, interpolated string.
 */
export function t(
  lang: Lang,
  key: string,
  params: Record<string, string | number> = {},
): string {
  const raw = lookup(DICTS[lang], key) ?? lookup(DICTS[DEFAULT_LANG], key);
  if (raw === undefined) {
    throw new Error(`Missing translation key: ${key}`);
  }
  return raw.replace(/{(\w+)}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

/**
 * Looks up a key in a dictionary
 * @param {Record<string, unknown>} dict Dictionary
 * @param {string} key Key to lookup
 * @return {string} The key's corresponding value
 */
function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>(
    (acc, part) =>
      acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
    dict,
  );
  return typeof value === "string" ? value : undefined;
}
