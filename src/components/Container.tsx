import { SiteHeader } from "./SiteHeader";

/** Header plus centered page column, for every page except the full-bleed home page. */
export function Container({
  active,
  wide = false,
  children,
}: {
  active?: "home" | "decks" | "more";
  /** Use most of the screen width (the deck page). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader active={active} />
      <div className={`mx-auto w-full px-4 py-5 ${wide ? "max-w-[1600px] sm:px-6 lg:py-8" : "max-w-3xl"}`}>
        {children}
      </div>
    </>
  );
}
