/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  unsafeCSS,
  CSSResultGroup,
  PropertyValues,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  ActionConfig,
  HomeAssistant,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from 'custom-card-helpers';
import { handleAction, hasAction, hasDoubleClick } from 'custom-card-helpers';
import { CARD_NAME, CARD_TYPE, CARD_VERSION } from './const';
import { openConfirmDialog } from './confirm-dialog';
import cardCss from './spinbutton.css';

interface SpinbuttonCardConfig extends LovelaceCardConfig {
  name?: string;
  entity?: string;
  icon?: string;
  icon_size?: number;
  layout?: string;
  radius?: number;
  ring_width?: number;
  card_width?: number | string;
  card_height?: number | string;
  stops?: 'multi' | 'blue' | 'red' | 'green' | 'orange' | 'yellow' | 'none';
  speed?: number;
  background?: string | [number, number, number] | { r: number; g: number; b: number };
  icon_color?: string | [number, number, number] | { r: number; g: number; b: number };
  name_color?: string | [number, number, number] | { r: number; g: number; b: number };
  state_color?: string | [number, number, number] | { r: number; g: number; b: number };
  animation?: boolean;
  show_ring?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  confirm_actions?: boolean;
}

/* eslint no-console: 0 */
console.info(
  `%c  ${CARD_NAME} \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: 'Custom button card with a configurable, spinning border',
  preview: true,
});

@customElement(CARD_TYPE)
export class SpinbuttonCard extends LitElement {
  private _hass?: HomeAssistant;

  private _tapTimeout?: number;
  private _holdTimeout?: number;
  private _holding = false;
  private _confirmPromise?: Promise<boolean>;

  @property({ attribute: false })
  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;
    this.requestUpdate('hass', oldHass);
  }

  public get hass(): HomeAssistant {
    return this._hass as HomeAssistant;
  }
  @property() private config!: SpinbuttonCardConfig;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('spinbutton-editor') as LovelaceCardEditor;
  }

  public setConfig(config: SpinbuttonCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = { ...config };
  }

  protected render(): TemplateResult {
    
    const entityId = this.config?.entity;
    const stateObj = entityId && this.hass ? this.hass.states[entityId] : undefined;
    const name = this.config?.name ?? stateObj?.attributes?.friendly_name ?? 'Spinbutton';
    const custom_css = this.config?.custom_css ?? stateObj?.attributes?.custom_css ?? '';
    const layout = this.config?.layout ?? stateObj?.attributes?.layout ?? 'icon_name_h';
    const icon = this.config?.icon ?? stateObj?.attributes?.icon ?? 'mdi:rotate-right';
    const iconSize = this.config?.icon_size ?? 32;
    const iconColor = this._resolveColor(this.config?.icon_color, 'currentColor');
    const nameColor = this._resolveColor(this.config?.name_color, 'currentColor');
    const stateColor = this._resolveColor(this.config?.state_color, 'currentColor');
    const isInteractive =
      hasAction(this.config?.tap_action) ||
      hasAction(this.config?.hold_action) ||
      hasDoubleClick(this.config?.double_tap_action);
    return html`
      <style>${custom_css}</style>
      <ha-card
        class="spinbutton"
        tabindex=${isInteractive ? 0 : -1}
        role=${isInteractive ? 'button' : 'group'}
        @click=${this._handleClick}
        @dblclick=${this._handleDoubleClick}
        @pointerdown=${this._handlePointerDown}
        @pointerup=${this._handlePointerUp}
        @pointerleave=${this._handlePointerLeave}
        @pointercancel=${this._handlePointerLeave}
        @keydown=${this._handleKeyDown}
      >
        
        <div id="content" class="${layout}">
          <ha-icon
            id="icon"
            class="${layout} spinbutton"
            style="--mdc-icon-size: ${iconSize}px; color: ${iconColor};"
            icon="${icon}"
          ></ha-icon>
          <div id="name" class="${layout} spinbutton" style="color: ${nameColor};">${name}</div>
          <div id="state" class="${layout} spinbutton" style="color: ${stateColor};">${stateObj?.state}</div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(cardCss)}
    `;
  }

  public getCardSize(): number {
    return 1;
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {

    if (changedProps.has('config' as keyof SpinbuttonCard)) {
      return true;
    }

    if (changedProps.has('hass' as keyof SpinbuttonCard)) {
      const entityId = this.config?.entity;
      if (!entityId) return true;
      const oldHass = changedProps.get('hass' as keyof SpinbuttonCard) as HomeAssistant | undefined;
      const oldState = oldHass?.states[entityId];
      const newState = this.hass?.states[entityId];
      return oldState !== newState;
    }

    return true;
  }

  protected updated(): void {
    
    if (!this.config) return;
    
    const radius = this.config.radius ?? 8;
    const ringWidth = this.config.ring_width ?? 2;
    const cardWidth = this._resolveLength(this.config.card_width, '150px');
    const cardHeight = this._resolveLength(this.config.card_height, '100px');
    const speed = this.config.speed ?? 0.8;
    const background = this._resolveColor(this.config.background, '#1C1F2B');
    const animation = this._resolveBoolean(this.config.animation, true);
    const showRing = this._resolveBoolean(this.config.show_ring, true);
    const stops = this._resolveStops(this.config.stops);
    const iconSize = this.config.icon_size ?? 32;
    this.style.setProperty('--radius', `${radius}px`);
    this.style.setProperty('--ring-width', `${ringWidth}px`);
    this.style.setProperty('--card-width', cardWidth);
    this.style.setProperty('--card-height', cardHeight);
    this.style.setProperty('--spin-speed', `${speed}s`);
    this.style.setProperty('--card-bg', background);
    this.style.setProperty('--animation', animation ? `spin ${speed}s linear infinite` : 'none');
    this.style.setProperty('--ring-active', showRing ? '1' : '0');
    this.style.setProperty('--stops', stops);
    this.style.setProperty('--mdc-icon-size', `${iconSize}px`);
  }

  private _resolveStops(stops?: SpinbuttonCardConfig['stops']): string {
    const templated = typeof stops === 'string' ? this._evaluateTemplate(stops) : undefined;
    const resolved = typeof templated === 'string' ? templated : stops;
    switch (resolved) {
      case 'blue':
        return 'var(--color-stops-blue)';
      case 'red':
        return 'var(--color-stops-red)';
      case 'green':
        return 'var(--color-stops-green)';
      case 'orange':
        return 'var(--color-stops-orange)';
      case 'yellow':
        return 'var(--color-stops-yellow)';
      case 'none':
        return 'transparent';
      case 'multi':
      default:
        return 'var(--color-stops-multi)';
    }
  }

  private _resolveBoolean(
    value?: boolean | string,
    fallback = false
  ): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const templated = this._evaluateTemplate(value);
      if (typeof templated === 'boolean') return templated;
      const resolved = typeof templated === 'string' ? templated : value;
      const normalized = resolved.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
  }

  private _resolveLength(value?: number | string, fallback = '0px'): string {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    return fallback;
  }

  private _resolveColor(
    value?: SpinbuttonCardConfig['background'],
    fallback = '#1C1F2B'
  ): string {
    if (Array.isArray(value) && value.length >= 3) {
      return `rgb(${value[0]} ${value[1]} ${value[2]})`;
    }
    if (value && typeof value === 'object') {
      const { r, g, b } = value as { r?: number; g?: number; b?: number };
      if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
        return `rgb(${r} ${g} ${b})`;
      }
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const templated = this._evaluateTemplate(value);
      if (templated !== undefined) {
        const templatedText = typeof templated === 'string' ? templated : String(templated);
        if (templatedText.trim() !== '') {
          return templatedText;
        }
      }
      return value;
    }
    return fallback;
  }

  private _evaluateTemplate(value: string): unknown | undefined {
    const trimmed = value.trim();
    if (!trimmed.startsWith('[[[') || !trimmed.endsWith(']]]')) {
      return undefined;
    }
    const expression = trimmed.slice(3, -3);
    try {
      const fn = new Function(
        'hass',
        'states',
        'entity',
        expression
      ) as (hass: HomeAssistant, states: HomeAssistant['states'], entity?: string) => unknown;
      const entityId = this.config?.entity;
      const result = fn(this.hass, this.hass?.states, entityId);
      if (result !== undefined) {
        return result;
      }
    } catch {}
    try {
      const fn = new Function(
        'hass',
        'states',
        'entity',
        `return (${expression});`
      ) as (hass: HomeAssistant, states: HomeAssistant['states'], entity?: string) => unknown;
      const entityId = this.config?.entity;
      return fn(this.hass, this.hass?.states, entityId);
    } catch {
      return undefined;
    }
  }

  private _confirmAction(): Promise<boolean> {
    if (!this._resolveBoolean(this.config?.confirm_actions, false)) {
      return Promise.resolve(true);
    }
    if (this._confirmPromise) {
      return this._confirmPromise;
    }
    this._confirmPromise = openConfirmDialog(this).finally(() => {
      this._confirmPromise = undefined;
    });
    return this._confirmPromise;
  }

  private _handlePointerDown(ev: PointerEvent): void {
    if (!this.hass || !this.config) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    this._holding = false;
    this._clearHoldTimeout();
    if (hasAction(this.config.hold_action)) {
      this._holdTimeout = window.setTimeout(() => {
        this._holding = true;
        this._clearTapTimeout();
        void this._confirmAndHandle('hold', true);
      }, 500);
    }
  }

  private _handlePointerUp(): void {
    this._clearHoldTimeout();
  }

  private _handlePointerLeave(): void {
    this._clearHoldTimeout();
  }

  private _handleClick(): void {
    if (!this.hass || !this.config) return;
    if (this._holding) {
      this._holding = false;
      return;
    }
    if (hasDoubleClick(this.config.double_tap_action)) {
      this._clearTapTimeout();
      this._tapTimeout = window.setTimeout(() => {
        void this._confirmAndHandle('tap');
      }, 250);
      return;
    }
    void this._confirmAndHandle('tap');
  }

  private _handleDoubleClick(): void {
    if (!this.hass || !this.config) return;
    if (!hasDoubleClick(this.config.double_tap_action)) return;
    this._clearTapTimeout();
    void this._confirmAndHandle('double_tap');
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this._handleClick();
  }

  private _clearHoldTimeout(): void {
    if (this._holdTimeout !== undefined) {
      window.clearTimeout(this._holdTimeout);
      this._holdTimeout = undefined;
    }
  }

  private _clearTapTimeout(): void {
    if (this._tapTimeout !== undefined) {
      window.clearTimeout(this._tapTimeout);
      this._tapTimeout = undefined;
    }
  }

  private async _confirmAndHandle(
    action: 'tap' | 'hold' | 'double_tap',
    clearHoldingOnCancel = false
  ): Promise<void> {
    if (!this.hass || !this.config) return;
    const ok = await this._confirmAction();
    if (!ok) {
      if (clearHoldingOnCancel) {
        this._holding = false;
      }
      return;
    }
    handleAction(this, this.hass, this.config, action);
  }

}
