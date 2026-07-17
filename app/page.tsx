"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import cards from "./card-data.json";

type Language = "zh" | "ja" | "en";
type Card = (typeof cards)[number];

const CARDS_PER_PAGE = 10;
const PAGE_COUNT = Math.ceil(cards.length / CARDS_PER_PAGE);

const copy = {
  zh: {
    title: "贪婪之岛",
    subtitle: "指定口袋卡册",
    open: "点击开启卡册",
    archive: "指定口袋 · No.000—099",
    search: "搜索卡名或效果",
    jump: "输入编号",
    go: "跳转",
    cover: "返回封面",
    previous: "上一页",
    next: "下一页",
    page: "页",
    empty: "没有找到匹配的卡牌",
    results: "搜索结果",
    rank: "等级",
    limit: "限量",
    close: "关闭卡牌",
    swipe: "左右滑动翻页",
  },
  ja: {
    title: "グリードアイランド",
    subtitle: "指定ポケットカード",
    open: "タップしてバインダーを開く",
    archive: "指定ポケット · No.000—099",
    search: "カード名・効果を検索",
    jump: "番号を入力",
    go: "移動",
    cover: "表紙に戻る",
    previous: "前のページ",
    next: "次のページ",
    page: "ページ",
    empty: "該当するカードはありません",
    results: "検索結果",
    rank: "ランク",
    limit: "限度枚数",
    close: "カードを閉じる",
    swipe: "左右にスワイプしてページをめくる",
  },
  en: {
    title: "Greed Island",
    subtitle: "Specified Slot Binder",
    open: "Tap to open the binder",
    archive: "Specified slots · No.000—099",
    search: "Search card name or effect",
    jump: "Enter number",
    go: "Go",
    cover: "Back to cover",
    previous: "Previous page",
    next: "Next page",
    page: "Page",
    empty: "No matching cards found",
    results: "Search results",
    rank: "Rank",
    limit: "Limit",
    close: "Close card",
    swipe: "Swipe left or right to turn pages",
  },
} as const;

const languageLabels: Record<Language, string> = {
  zh: "中文",
  ja: "日本語",
  en: "EN",
};

function imagePath(kind: "cards" | "thumbs", language: Language, number: string) {
  return `./${kind}/${language}/${number}.webp`;
}

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("zh");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [jumpNumber, setJumpNumber] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const bookTouchStart = useRef<number | null>(null);
  const cardTouchStart = useRef<number | null>(null);
  const t = copy[language];

  const pageCards = cards.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return cards.filter((card) => {
      const text = [
        card.number,
        card.zh.name,
        card.zh.effect,
        card.ja.name,
        card.ja.effect,
        card.en.name,
        card.en.effect,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const selectedCard = selectedIndex === null ? null : cards[selectedIndex];

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (selectedIndex !== null) {
        if (event.key === "Escape") setSelectedIndex(null);
        if (event.key === "ArrowLeft") setSelectedIndex(Math.max(0, selectedIndex - 1));
        if (event.key === "ArrowRight") setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1));
        return;
      }
      if (!isOpen) return;
      if (event.key === "ArrowLeft") setPage((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setPage((value) => Math.min(PAGE_COUNT - 1, value + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (highlighted === null) return;
    const timeout = window.setTimeout(() => setHighlighted(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [highlighted]);

  const openCard = (card: Card) => {
    const index = Number(card.number);
    setPage(Math.floor(index / CARDS_PER_PAGE));
    setSelectedIndex(index);
    setQuery("");
  };

  const jumpToCard = (event: FormEvent) => {
    event.preventDefault();
    if (jumpNumber === "") return;
    const index = Math.min(99, Math.max(0, Number.parseInt(jumpNumber, 10)));
    if (Number.isNaN(index)) return;
    setPage(Math.floor(index / CARDS_PER_PAGE));
    setHighlighted(index);
    setJumpNumber(index.toString().padStart(3, "0"));
  };

  const finishBookSwipe = (clientX: number) => {
    if (bookTouchStart.current === null) return;
    const distance = clientX - bookTouchStart.current;
    if (Math.abs(distance) > 46) {
      setPage((value) =>
        distance < 0 ? Math.min(PAGE_COUNT - 1, value + 1) : Math.max(0, value - 1),
      );
    }
    bookTouchStart.current = null;
  };

  const finishCardSwipe = (clientX: number) => {
    if (cardTouchStart.current === null || selectedIndex === null) return;
    const distance = clientX - cardTouchStart.current;
    if (Math.abs(distance) > 46) {
      setSelectedIndex(
        distance < 0 ? Math.min(cards.length - 1, selectedIndex + 1) : Math.max(0, selectedIndex - 1),
      );
    }
    cardTouchStart.current = null;
  };

  const onJumpInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
  };

  if (!isOpen) {
    return (
      <main className="cover-stage">
        <div className="cover-glow" aria-hidden="true" />
        <button className="binder-cover" onClick={() => setIsOpen(true)} aria-label={t.open}>
          <span className="cover-spine" aria-hidden="true">
            <span>GREED ISLAND</span>
          </span>
          <span className="cover-title">HUNTER × HUNTER</span>
          <span className="cover-panel" aria-hidden="true">
            <span className="cover-sword cover-sword-left" />
            <span className="cover-sword cover-sword-right" />
            <span className="cover-target">
              <span className="target-arrow target-arrow-top" />
              <span className="target-arrow target-arrow-right" />
              <span className="target-arrow target-arrow-bottom" />
              <span className="target-arrow target-arrow-left" />
            </span>
          </span>
          <span className="cover-brand">GREED ISLAND</span>
          <span className="cover-open-hint">{t.open}</span>
        </button>
        <div className="cover-language" aria-label="Language">
          {(Object.keys(languageLabels) as Language[]).map((code) => (
            <button
              key={code}
              className={language === code ? "active" : ""}
              onClick={() => setLanguage(code)}
            >
              {languageLabels[code]}
            </button>
          ))}
        </div>
        <p className="cover-caption">{t.archive}</p>
      </main>
    );
  }

  return (
    <main className="binder-app">
      <header className="app-header">
        <button className="icon-button cover-button" onClick={() => setIsOpen(false)} aria-label={t.cover}>
          <span aria-hidden="true">×</span>
        </button>
        <div className="app-heading">
          <strong>{t.title}</strong>
          <span>{t.subtitle}</span>
        </div>
        <div className="language-switch" aria-label="Language">
          {(Object.keys(languageLabels) as Language[]).map((code) => (
            <button
              key={code}
              className={language === code ? "active" : ""}
              onClick={() => setLanguage(code)}
              aria-pressed={language === code}
            >
              {languageLabels[code]}
            </button>
          ))}
        </div>
      </header>

      <section className="finder" aria-label="Card finder">
        <div className="search-shell">
          <span className="search-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          )}
          {normalizedQuery && (
            <div className="search-results" role="listbox" aria-label={t.results}>
              {searchResults.length ? (
                searchResults.slice(0, 30).map((card) => (
                  <button key={card.number} onClick={() => openCard(card)} role="option">
                    <img src={imagePath("thumbs", language, card.number)} alt="" />
                    <span>
                      <b>No.{card.number}</b>
                      <strong>{card[language].name}</strong>
                      <small>{card[language].effect}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p>{t.empty}</p>
              )}
            </div>
          )}
        </div>
        <form className="jump-form" onSubmit={jumpToCard}>
          <input
            type="number"
            min="0"
            max="99"
            inputMode="numeric"
            value={jumpNumber}
            onChange={(event) => setJumpNumber(event.target.value)}
            onKeyDown={onJumpInputKeyDown}
            placeholder="No."
            aria-label={t.jump}
          />
          <button type="submit">{t.go}</button>
        </form>
      </section>

      <section
        className="book-shell"
        onTouchStart={(event) => (bookTouchStart.current = event.changedTouches[0].clientX)}
        onTouchEnd={(event) => finishBookSwipe(event.changedTouches[0].clientX)}
      >
        <div className="book-rings" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="book-page" key={`${language}-${page}`}>
          <div className="page-heading">
            <span>{t.archive}</span>
            <strong>
              {t.page} {page + 1}/{PAGE_COUNT}
            </strong>
          </div>
          <div className="card-grid">
            {pageCards.map((card) => {
              const index = Number(card.number);
              return (
                <button
                  key={card.number}
                  className={`card-slot ${highlighted === index ? "highlighted" : ""}`}
                  onClick={() => openCard(card)}
                  aria-label={`No.${card.number} ${card[language].name}`}
                >
                  <span className="slot-pocket">
                    <img
                      src={imagePath("thumbs", language, card.number)}
                      alt={`${card[language].name} thumbnail`}
                      loading="lazy"
                    />
                  </span>
                  <span className="slot-meta">
                    <b>{card.number}</b>
                    <span>{card[language].name}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="swipe-hint">{t.swipe}</p>
        </div>
      </section>

      <nav className="page-controls" aria-label="Page navigation">
        <button
          className="icon-button"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          aria-label={t.previous}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="page-dots" aria-label={`${page + 1} / ${PAGE_COUNT}`}>
          {Array.from({ length: PAGE_COUNT }).map((_, index) => (
            <button
              key={index}
              className={index === page ? "active" : ""}
              onClick={() => setPage(index)}
              aria-label={`${t.page} ${index + 1}`}
              aria-current={index === page ? "page" : undefined}
            />
          ))}
        </div>
        <button
          className="icon-button"
          disabled={page === PAGE_COUNT - 1}
          onClick={() => setPage((value) => Math.min(PAGE_COUNT - 1, value + 1))}
          aria-label={t.next}
        >
          <span aria-hidden="true">›</span>
        </button>
      </nav>

      {selectedCard && selectedIndex !== null && (
        <div className="card-modal" role="dialog" aria-modal="true" aria-label={selectedCard[language].name}>
          <div
            className="card-viewer"
            onTouchStart={(event) => (cardTouchStart.current = event.changedTouches[0].clientX)}
            onTouchEnd={(event) => finishCardSwipe(event.changedTouches[0].clientX)}
          >
            <header>
              <div>
                <span>No.{selectedCard.number}</span>
                <strong>{selectedCard[language].name}</strong>
              </div>
              <button className="icon-button" onClick={() => setSelectedIndex(null)} aria-label={t.close}>
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="card-image-stage">
              <button
                className="modal-arrow modal-arrow-left"
                disabled={selectedIndex === 0}
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                aria-label={t.previous}
              >
                ‹
              </button>
              <img
                key={`${language}-${selectedCard.number}`}
                src={imagePath("cards", language, selectedCard.number)}
                alt={`No.${selectedCard.number} ${selectedCard[language].name}`}
              />
              <button
                className="modal-arrow modal-arrow-right"
                disabled={selectedIndex === cards.length - 1}
                onClick={() => setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1))}
                aria-label={t.next}
              >
                ›
              </button>
            </div>
            <div className="card-details">
              <div className="card-stats">
                <span>{t.rank} <b>{selectedCard.rank}</b></span>
                <span>{t.limit} <b>{selectedCard.limit}</b></span>
              </div>
              <p>{selectedCard[language].effect}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
