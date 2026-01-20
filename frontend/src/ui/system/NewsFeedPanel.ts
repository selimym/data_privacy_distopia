/**
 * NewsFeedPanel - News Article Feed & Media Suppression Interface
 *
 * Displays recent news articles from various outlets with expandable cards.
 * Allows suppression of news channels or silencing of individual reporters.
 *
 * Design: Right sidebar, compact cards with hover actions, last 10 articles
 */

import type { NewsArticleRead, NewsChannelRead } from '../../types/system';

export interface NewsFeedPanelConfig {
  articles?: NewsArticleRead[];  // Optional - may not be loaded yet
  channels?: NewsChannelRead[];  // Optional - may not be loaded yet
  maxArticles?: number;
  onSuppressChannel?: (channelId: string, channelName: string) => void;
  onSilenceReporter?: (articleId: string, channelName: string) => void;
  onArticleExpanded?: (articleId: string) => void;
}

interface StanceInfo {
  label: string;
  colorClass: string;
  icon: string;
}

export class NewsFeedPanel {
  private container: HTMLDivElement;
  private config: NewsFeedPanelConfig;
  private expandedArticles: Set<string>;
  private maxArticles: number;

  // Stance styling
  private readonly STANCE_INFO: Record<string, StanceInfo> = {
    critical: {
      label: 'Critical',
      colorClass: 'stance-critical',
      icon: '⚠️'
    },
    independent: {
      label: 'Independent',
      colorClass: 'stance-independent',
      icon: '📰'
    },
    state_friendly: {
      label: 'State-Friendly',
      colorClass: 'stance-state',
      icon: '✓'
    }
  };

  constructor(config: NewsFeedPanelConfig) {
    this.config = config;
    this.expandedArticles = new Set();
    this.maxArticles = config.maxArticles || 10;
    this.container = this.createPanel();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'news-feed-panel';
    panel.innerHTML = this.getPanelHTML();
    this.setupEventListeners(panel);
    return panel;
  }

  private getPanelHTML(): string {
    const articles = this.config.articles || [];
    const displayArticles = articles.slice(0, this.maxArticles);
    const totalArticles = articles.length;
    const hiddenCount = Math.max(0, totalArticles - this.maxArticles);

    return `
      <div class="news-feed-header">
        <div class="header-left">
          <span class="news-icon">📡</span>
          <h3>NEWS FEED</h3>
        </div>
        <div class="article-count">${displayArticles.length} / ${totalArticles}</div>
      </div>

      <div class="news-feed-list">
        ${displayArticles.length > 0
          ? displayArticles.map(article => this.getArticleCardHTML(article)).join('')
          : '<div class="no-articles">No news articles yet</div>'
        }
      </div>

      ${hiddenCount > 0 ? `
        <div class="news-feed-footer">
          <span class="hidden-count">+${hiddenCount} older article${hiddenCount > 1 ? 's' : ''} (archived)</span>
        </div>
      ` : ''}
    `;
  }

  private getArticleCardHTML(article: NewsArticleRead): string {
    const isExpanded = this.expandedArticles.has(article.id);
    const channel = this.getChannelInfo(article.news_channel_id);
    const stance = this.STANCE_INFO[channel?.stance || 'independent'];
    const articleAge = this.getArticleAge(article.created_at);

    return `
      <div class="news-article-card ${isExpanded ? 'expanded' : ''}"
           data-article-id="${article.id}"
           data-channel-id="${article.news_channel_id}">

        <!-- Suppression Overlay -->
        ${article.was_suppressed ? `
          <div class="suppression-overlay">
            <span class="suppression-icon">🚫</span>
            <span>SUPPRESSED</span>
          </div>
        ` : ''}

        <!-- Card Header (always visible) -->
        <div class="article-header" data-action="toggle-expand">
          <div class="article-meta">
            <span class="channel-name ${stance.colorClass}">${article.channel_name}</span>
            <span class="stance-badge ${stance.colorClass}">
              <span class="stance-icon">${stance.icon}</span>
              ${stance.label}
            </span>
            <span class="article-age">${articleAge}</span>
          </div>

          <h4 class="article-headline">${this.escapeHtml(article.headline)}</h4>

          <div class="article-footer-compact">
            <div class="metrics-impact">
              ${this.getMetricsImpactHTML(article)}
            </div>
            <div class="expand-indicator">
              <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
              <span class="expand-text">${isExpanded ? 'Collapse' : 'Read more'}</span>
            </div>
          </div>
        </div>

        <!-- Expanded Content (shown when expanded) -->
        ${isExpanded ? `
          <div class="article-body">
            <p class="article-summary">${this.escapeHtml(article.summary)}</p>

            <div class="article-details">
              <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${this.formatArticleType(article.article_type)}</span>
              </div>
              ${article.triggered_by_action_id ? `
                <div class="detail-item">
                  <span class="detail-label">Triggered by:</span>
                  <span class="detail-value">Recent Action</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Action Buttons (shown on hover, hidden if suppressed) -->
        ${!article.was_suppressed && !channel?.is_banned ? `
          <div class="article-actions">
            <button class="action-btn suppress-channel"
                    data-action="suppress-channel"
                    data-channel-id="${article.news_channel_id}"
                    data-channel-name="${article.channel_name}">
              <span class="action-icon">🚫</span>
              <span>Suppress Outlet</span>
            </button>
            <button class="action-btn silence-reporter"
                    data-action="silence-reporter"
                    data-article-id="${article.id}"
                    data-channel-name="${article.channel_name}">
              <span class="action-icon">🔇</span>
              <span>Silence Reporter</span>
            </button>
          </div>
        ` : ''}

        ${channel?.is_banned ? `
          <div class="banned-notice">
            <span class="banned-icon">🚫</span>
            <span>OUTLET BANNED</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getMetricsImpactHTML(article: NewsArticleRead): string {
    const impacts: string[] = [];

    if (article.international_awareness_change > 0) {
      impacts.push(`
        <span class="impact-awareness" title="International Awareness +${article.international_awareness_change}">
          <span class="impact-icon">🌍</span>
          <span class="impact-value">+${article.international_awareness_change}</span>
        </span>
      `);
    }

    if (article.public_anger_change > 0) {
      impacts.push(`
        <span class="impact-anger" title="Public Anger +${article.public_anger_change}">
          <span class="impact-icon">😡</span>
          <span class="impact-value">+${article.public_anger_change}</span>
        </span>
      `);
    }

    return impacts.length > 0
      ? impacts.join('')
      : '<span class="no-impact">No metrics impact</span>';
  }

  private formatArticleType(type: string): string {
    const typeMap: Record<string, string> = {
      'triggered': 'Event Coverage',
      'random': 'Background News',
      'exposure': 'Operator Exposure'
    };
    return typeMap[type] || type;
  }

  private getArticleAge(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  private getChannelInfo(channelId: string): NewsChannelRead | undefined {
    return this.config.channels?.find(c => c.id === channelId);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupEventListeners(panel: HTMLDivElement): void {
    // Toggle expand/collapse
    panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const toggleElement = target.closest('[data-action="toggle-expand"]');

      if (toggleElement) {
        const card = toggleElement.closest('.news-article-card');
        if (card) {
          const articleId = card.getAttribute('data-article-id');
          if (articleId) {
            this.toggleArticle(articleId);
          }
        }
        return;
      }

      // Handle action buttons
      const actionElement = target.closest('[data-action]') as HTMLElement;
      if (!actionElement) return;

      const action = actionElement.getAttribute('data-action');

      if (action === 'suppress-channel') {
        const channelId = actionElement.getAttribute('data-channel-id');
        const channelName = actionElement.getAttribute('data-channel-name');
        if (channelId && channelName && this.config.onSuppressChannel) {
          this.config.onSuppressChannel(channelId, channelName);
        }
      } else if (action === 'silence-reporter') {
        const articleId = actionElement.getAttribute('data-article-id');
        const channelName = actionElement.getAttribute('data-channel-name');
        if (articleId && channelName && this.config.onSilenceReporter) {
          this.config.onSilenceReporter(articleId, channelName);
        }
      }
    });
  }

  private toggleArticle(articleId: string): void {
    if (this.expandedArticles.has(articleId)) {
      this.expandedArticles.delete(articleId);
    } else {
      this.expandedArticles.add(articleId);
      if (this.config.onArticleExpanded) {
        this.config.onArticleExpanded(articleId);
      }
    }
    this.refresh();
  }

  /**
   * Update panel with new articles
   */
  public update(articles: NewsArticleRead[], channels?: NewsChannelRead[]): void {
    this.config.articles = articles;
    if (channels) {
      this.config.channels = channels;
    }
    this.refresh();
  }

  /**
   * Refresh the panel display
   */
  private refresh(): void {
    const scrollTop = this.container.querySelector('.news-feed-list')?.scrollTop || 0;
    this.container.innerHTML = this.getPanelHTML();
    this.setupEventListeners(this.container);

    // Restore scroll position
    const list = this.container.querySelector('.news-feed-list');
    if (list) {
      list.scrollTop = scrollTop;
    }
  }

  /**
   * Clear all expanded states
   */
  public collapseAll(): void {
    this.expandedArticles.clear();
    this.refresh();
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLDivElement {
    return this.container;
  }

  /**
   * Destroy the panel
   */
  public destroy(): void {
    this.container.remove();
  }
}
