import Script from "next/script";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Game Radar</p>
          <h1 id="pageTitle">榜单监控</h1>
          <p id="pageSubtitle" className="page-subtitle">实时 App Store 与 Steam 指标</p>
        </div>
        <div className="actions">
          <button id="refreshButton" type="button">刷新</button>
          <span id="status" className="status">准备加载</span>
        </div>
      </header>

      <nav id="pageNav" className="page-nav" aria-label="监控页面" />
      <section id="summary" className="summary-grid" aria-label="核心指标" />
      <section id="monitorList" className="game-list" aria-label="监控列表" />

      <Script src="/app.js" type="module" strategy="afterInteractive" />
    </main>
  );
}
