
"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../lib/store";
import booksData from "../data/books/books.json";

type Book = {
  id: string;
  title: string;
  subtitle?: string;
  pages: { title: string; body: string[] }[];
  glossary?: { term: string; def: string }[];
};

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function BookViewer() {
  const open = useGameStore((s) => s.showBookViewer);
  const setOpen = useGameStore((s) => s.setShowBookViewer);

  const [selectedId, setSelectedId] = useState<string>((booksData as any).books?.[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"pages" | "glossary">("pages");

  const books: Book[] = (booksData as any).books ?? [];

  const book = useMemo(() => books.find((b) => b.id === selectedId) ?? books[0], [books, selectedId]);
  const maxPage = (book?.pages?.length ?? 1) - 1;

  function selectBook(id: string) {
    setSelectedId(id);
    setPage(0);
    setTab("pages");
  }

  function close() {
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.58)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "90vh",
          overflow: "hidden",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(34,211,238,0.55)",
          borderRadius: 14,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.65)",
          display: "grid",
          gridTemplateColumns: "320px 1fr"
        }}
      >
        {/* Left: Library */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.10)", padding: 14, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900, color: "#67e8f9" }}>LAB LIBRARY</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                Read short “field manuals” that connect to what you’re doing in the lab.
              </div>
            </div>
            <button
              onClick={close}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {books.map((b) => {
              const active = b.id === book?.id;
              return (
                <button
                  key={b.id}
                  onClick={() => selectBook(b.id)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: active ? "2px solid rgba(103,232,249,0.55)" : "1px solid rgba(255,255,255,0.10)",
                    background: active ? "rgba(103,232,249,0.10)" : "rgba(255,255,255,0.04)",
                    color: "#e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontWeight: 900, color: active ? "#67e8f9" : "#a5b4fc" }}>{b.title}</div>
                  {b.subtitle ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{b.subtitle}</div> : null}
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {b.pages.length} pages · {b.glossary?.length ?? 0} glossary terms
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
            Tip: Use this like a real engineer—read, test in the lab, then inspect artifacts.
          </div>
        </div>

        {/* Right: Book */}
        <div style={{ padding: 14, overflow: "auto" }}>
          {book ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#e5e7eb" }}>{book.title}</div>
                  {book.subtitle ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{book.subtitle}</div> : null}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setTab("pages")}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: tab === "pages" ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    Pages
                  </button>
                  <button
                    onClick={() => setTab("glossary")}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: tab === "glossary" ? "rgba(165,180,252,0.14)" : "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    Glossary
                  </button>
                </div>
              </div>

              {tab === "pages" ? (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 12,
                      padding: 14
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#67e8f9" }}>
                      {book.pages[page]?.title ?? "Page"}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", opacity: 0.96 }}>
                      {(book.pages[page]?.body ?? []).join("\n")}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page <= 0}
                      style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: page <= 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                        color: "#e5e7eb",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: page <= 0 ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        fontSize: 12
                      }}
                    >
                      ← Prev
                    </button>

                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Page <b>{page + 1}</b> / <b>{maxPage + 1}</b>
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                      disabled={page >= maxPage}
                      style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: page >= maxPage ? "rgba(255,255,255,0.06)" : "rgba(56,189,248,0.14)",
                        color: "#e5e7eb",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: page >= maxPage ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        fontSize: 12
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Glossary</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {(book.glossary ?? []).map((g) => (
                      <div
                        key={g.term}
                        style={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 12,
                          padding: 12
                        }}
                      >
                        <div style={{ fontWeight: 900, color: "#fde68a" }}>{g.term}</div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>{g.def}</div>
                      </div>
                    ))}
                    {!(book.glossary?.length) ? <div style={{ fontSize: 12, opacity: 0.8 }}>No glossary for this book.</div> : null}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.85 }}>No books found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
