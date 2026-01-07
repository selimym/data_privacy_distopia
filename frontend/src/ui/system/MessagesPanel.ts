/**
 * MessagesPanel - Private Communications Viewer
 *
 * Displays intercepted messages in an invasive chat log format.
 * The discomfort is intentional - players read private conversations
 * and must decide if normal human venting constitutes a crime.
 */

import type { MessageRead } from '../../types/system';
import { getSystemAudioManager } from '../../audio/SystemAudioManager';

export interface MessagesPanelConfig {
  citizenName: string;
  messages: MessageRead[];
  onFlagMessage?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export class MessagesPanel {
  private container: HTMLDivElement;
  private config: MessagesPanelConfig;

  constructor(config: MessagesPanelConfig) {
    this.config = config;
    this.container = this.createPanel();

    // Play invasive message open sound
    getSystemAudioManager().play('message_open');
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'messages-panel';
    panel.innerHTML = this.getPanelHTML();
    this.setupEventListeners(panel);
    return panel;
  }

  private getPanelHTML(): string {
    const { citizenName, messages } = this.config;
    const stats = this.calculateStats(messages);

    return `
      <div class="messages-header">
        <div class="header-title">
          <span class="classification-badge">CLASSIFIED</span>
          <h3>PRIVATE COMMUNICATIONS</h3>
        </div>
        <div class="subject-name">${this.formatName(citizenName)}</div>
      </div>

      <div class="messages-stats">
        <div class="stat-item">
          <span class="stat-label">Analysis Period</span>
          <span class="stat-value">Last 30 days</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Messages Analyzed</span>
          <span class="stat-value">${messages.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Overall Sentiment</span>
          <span class="stat-value sentiment-${this.getSentimentClass(stats.avgSentiment)}">
            ${stats.avgSentiment.toFixed(2)} (${this.getSentimentLabel(stats.avgSentiment)})
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Flagged</span>
          <span class="stat-value flagged-count">${stats.flaggedCount}</span>
        </div>
      </div>

      <div class="messages-list">
        ${messages.length === 0
          ? '<div class="no-messages">No intercepted communications in analysis period.</div>'
          : messages.map(msg => this.renderMessage(msg)).join('')
        }
      </div>

      ${this.config.hasMore ? `
        <button class="btn-load-more">LOAD MORE MESSAGES</button>
      ` : ''}

      <div class="surveillance-notice">
        <span class="notice-icon">&#9888;</span>
        All communications intercepted under Chat Control Directive 2024/1.
        Subject has not been notified of surveillance status.
      </div>
    `;
  }

  private renderMessage(msg: MessageRead): string {
    const isFlagged = msg.is_flagged;
    const timeAgo = this.formatTimeAgo(msg.timestamp);
    const highlightedContent = this.highlightKeywords(msg.content, msg.detected_keywords);

    return `
      <div class="message-card ${isFlagged ? 'flagged' : ''}" data-message-id="${msg.id}">
        <div class="message-recipient-line">
          <span class="recipient-label">To:</span>
          <span class="recipient-name">${msg.recipient_name}</span>
          ${msg.recipient_relationship ? `
            <span class="recipient-relationship">(${msg.recipient_relationship})</span>
          ` : ''}
          ${this.isRecipientFlagged(msg) ? `
            <span class="recipient-flagged">FLAGGED CITIZEN</span>
          ` : ''}
        </div>
        <div class="message-timestamp">${timeAgo}</div>

        <div class="message-divider"></div>

        <div class="message-content">
          <span class="quote-mark">"</span>${highlightedContent}<span class="quote-mark">"</span>
        </div>

        ${isFlagged ? `
          <div class="message-flags">
            <span class="flag-icon">&#9888;</span>
            <span class="flag-label">FLAGGED:</span>
            ${msg.flag_reasons.map(reason => `
              <span class="flag-reason">${this.formatFlagReason(reason)}</span>
            `).join(', ')}
          </div>
        ` : ''}

        <div class="message-actions">
          ${!isFlagged ? `
            <button class="btn-flag-message" data-message-id="${msg.id}">FLAG MESSAGE</button>
          ` : `
            <span class="already-flagged">FLAGGED FOR REVIEW</span>
          `}
        </div>

        ${msg.sentiment < -0.3 ? `
          <div class="sentiment-warning">
            Negative emotional content detected (${msg.sentiment.toFixed(2)})
          </div>
        ` : ''}
      </div>
    `;
  }

  private highlightKeywords(content: string, keywords: string[]): string {
    if (!keywords || keywords.length === 0) return this.escapeHtml(content);

    let highlighted = this.escapeHtml(content);

    // Sort by length descending to avoid partial replacements
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      const escapedKeyword = this.escapeHtml(keyword);
      const regex = new RegExp(`\\b(${this.escapeRegex(escapedKeyword)})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="keyword-highlight">$1</span>');
    }

    return highlighted;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private formatName(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 1].toUpperCase()}, ${parts.slice(0, -1).join(' ')}`;
    }
    return name.toUpperCase();
  }

  private formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours < 1) return 'Less than 1 hour ago';
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 14) {
      return '1 week ago';
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
    }
  }

  private formatFlagReason(reason: string): string {
    // Convert snake_case to readable format with context
    const formatted = reason.replace(/_/g, ' ');

    // Add contextual descriptions for known flag types
    const contextMap: Record<string, string> = {
      'flight risk': '"leaving" (flight_risk)',
      'negative sentiment': 'negative_sentiment',
      'therapist': '"therapist" cross-ref with health records',
      'organizing language': 'organizing_language',
      'coordination': 'coordination with flagged citizen',
      'dissent': 'potential_dissent',
      'protest': 'protest_terminology',
      'government criticism': 'anti-government_sentiment',
    };

    for (const [key, value] of Object.entries(contextMap)) {
      if (reason.toLowerCase().includes(key.replace(' ', '_')) ||
          formatted.toLowerCase().includes(key)) {
        return value;
      }
    }

    return formatted;
  }

  private isRecipientFlagged(msg: MessageRead): boolean {
    // Check if flag_reasons mention the recipient being flagged
    return msg.flag_reasons.some(r =>
      r.toLowerCase().includes('flagged') ||
      r.toLowerCase().includes('coordination')
    );
  }

  private calculateStats(messages: MessageRead[]): { avgSentiment: number; flaggedCount: number } {
    if (messages.length === 0) {
      return { avgSentiment: 0, flaggedCount: 0 };
    }

    const totalSentiment = messages.reduce((sum, m) => sum + m.sentiment, 0);
    const flaggedCount = messages.filter(m => m.is_flagged).length;

    return {
      avgSentiment: totalSentiment / messages.length,
      flaggedCount,
    };
  }

  private getSentimentClass(sentiment: number): string {
    if (sentiment <= -0.5) return 'very-negative';
    if (sentiment <= -0.2) return 'negative';
    if (sentiment <= 0.2) return 'neutral';
    if (sentiment <= 0.5) return 'positive';
    return 'very-positive';
  }

  private getSentimentLabel(sentiment: number): string {
    if (sentiment <= -0.5) return 'VERY NEGATIVE';
    if (sentiment <= -0.2) return 'NEGATIVE';
    if (sentiment <= 0.2) return 'NEUTRAL';
    if (sentiment <= 0.5) return 'POSITIVE';
    return 'VERY POSITIVE';
  }

  private setupEventListeners(panel: HTMLElement) {
    // Flag message buttons
    panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains('btn-flag-message')) {
        const messageId = target.getAttribute('data-message-id');
        if (messageId && this.config.onFlagMessage) {
          this.config.onFlagMessage(messageId);
        }
      }

      if (target.classList.contains('btn-load-more')) {
        if (this.config.onLoadMore) {
          this.config.onLoadMore();
        }
      }
    });
  }

  public getElement(): HTMLDivElement {
    return this.container;
  }

  public update(config: Partial<MessagesPanelConfig>) {
    this.config = { ...this.config, ...config };
    this.container.innerHTML = this.getPanelHTML();
    this.setupEventListeners(this.container);
  }

  public destroy() {
    this.container.remove();
  }
}
