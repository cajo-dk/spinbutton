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
import { handleAction, handleActionConfig, hasAction, hasDoubleClick, stateIcon } from 'custom-card-helpers';
import { CARD_NAME, CARD_TYPE, CARD_VERSION } from './const';
import { openConfirmDialog } from './confirm-dialog';
import { openKeypadDialog } from './keypad-dialog';
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
  badge?: string;
  animation?: boolean;
  show_ring?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  confirm_actions?: boolean;
  keypad_actions?: boolean;
  keypad_digits?: number | string;
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
  private _keypadPromise?: Promise<string | null>;

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
    const fallbackName = stateObj?.attributes?.friendly_name ?? 'Spinbutton';
    const name = this._resolveText(this.config?.name, fallbackName);
    const custom_css = this.config?.custom_css ?? stateObj?.attributes?.custom_css ?? '';
    const layout = this.config?.layout ?? stateObj?.attributes?.layout ?? 'icon_name_h';
    const entityIcon = stateObj?.attributes?.icon;
    const computedIcon = stateObj ? stateIcon(stateObj) : undefined;
    const icon = this._resolveIcon(
      this.config?.icon,
      entityIcon,
      computedIcon,
      'mdi:rotate-right'
    );
    const iconSize = this.config?.icon_size ?? 32;
    const iconColor = this._resolveColor(this.config?.icon_color, 'currentColor');
    const nameColor = this._resolveColor(this.config?.name_color, 'currentColor');
    const stateColor = this._resolveColor(this.config?.state_color, 'currentColor');
    const badge = this._resolveText(this.config?.badge, '');
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
          <div id="state" class="${layout} spinbutton" style="color: ${stateColor};">${this._formatState(stateObj?.state)}</div>
          ${badge
            ? html`<div id="badge" class="spinbutton" style="color: ${stateColor};">${badge}</div>`
            : ''}
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
      if (this._isTemplate(this.config?.badge)) {
        return true;
      }
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

  private _resolveBoolean(value?: unknown, fallback = false): boolean {
    const parse = (candidate: unknown): boolean | undefined => {
      if (typeof candidate === 'boolean') return candidate;
      if (typeof candidate === 'string') {
        const templated = this._evaluateTemplate(candidate);
        if (typeof templated === 'boolean') return templated;
        const resolved = typeof templated === 'string' ? templated : candidate;
        const normalized = resolved.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return undefined;
      }
      if (candidate && typeof candidate === 'object') {
        const shaped = candidate as { value?: unknown; id?: unknown };
        if (shaped.value !== undefined) {
          const parsedValue = parse(shaped.value);
          if (parsedValue !== undefined) return parsedValue;
        }
        if (shaped.id !== undefined) {
          const parsedId = parse(shaped.id);
          if (parsedId !== undefined) return parsedId;
        }
      }
      return undefined;
    };

    const resolved = parse(value);
    return resolved ?? fallback;
  }

  private _resolveLength(value?: number | string, fallback = '0px'): string {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string' && value.trim() !== '') {
      const templated = this._evaluateTemplate(value);
      if (templated !== undefined) {
        if (typeof templated === 'number') return `${templated}px`;
        if (typeof templated === 'string' && templated.trim() !== '') {
          return templated.trim();
        }
      }
      return value.trim();
    }
    return fallback;
  }

  private _formatState(value?: string): string {
    if (!value) return '';
    if (!value.includes('_')) {
      return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
    }
    const [first, ...rest] = value.split('_');
    const normalizedFirst = first
      ? `${first[0].toUpperCase()}${first.slice(1)}`
      : first;
    return [normalizedFirst, ...rest].join(' ');
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

  private _resolveText(value: string | undefined, fallback: string): string {
    if (typeof value === 'string' && value.trim() !== '') {
      const templated = this._evaluateTemplate(value);
      if (templated !== undefined) {
        return typeof templated === 'string' ? templated : String(templated);
      }
      return value;
    }
    return fallback;
  }

  private _resolveIcon(
    value: unknown,
    entityFallback: string | undefined,
    computedFallback: string | undefined,
    defaultFallback: string
  ): string {
    const fallback = entityFallback ?? computedFallback ?? defaultFallback;
    if (value && typeof value === 'object') {
      if ('value' in value) {
        return this._resolveIcon(
          (value as { value?: unknown }).value,
          entityFallback,
          computedFallback,
          defaultFallback
        );
      }
      if ('icon' in value) {
        return this._resolveIcon(
          (value as { icon?: unknown }).icon,
          entityFallback,
          computedFallback,
          defaultFallback
        );
      }
      if ('id' in value) {
        return this._resolveIcon(
          (value as { id?: unknown }).id,
          entityFallback,
          computedFallback,
          defaultFallback
        );
      }
    }
    if (typeof value === 'string') {
      if (this._isTemplate(value)) {
        const templated = this._evaluateTemplate(value);
        if (templated === undefined) return fallback;
        const text = typeof templated === 'string' ? templated : String(templated);
        return text.trim() !== '' ? text : fallback;
      }
      return value.trim() !== '' ? value : fallback;
    }
    return fallback;
  }

  private _evaluateTemplate(value: string): unknown | undefined {
    const trimmed = value.trim();
    if (!trimmed.startsWith('[[[') || !trimmed.endsWith(']]]')) {
      return undefined;
    }
    const expression = trimmed.slice(3, -3);
    const stateAttr = (entityId: string, attribute: string): unknown => {
      if (!entityId || !attribute) return undefined;
      return this.hass?.states?.[entityId]?.attributes?.[attribute];
    };
    try {
      const fn = new Function(
        'hass',
        'states',
        'entity',
        'state_attr',
        expression
      ) as (
        hass: HomeAssistant,
        states: HomeAssistant['states'],
        entity?: string,
        state_attr?: (entityId: string, attribute: string) => unknown
      ) => unknown;
      const entityId = this.config?.entity;
      const result = fn(this.hass, this.hass?.states, entityId, stateAttr);
      if (result !== undefined) {
        return result;
      }
    } catch {}
    try {
      const fn = new Function(
        'hass',
        'states',
        'entity',
        'state_attr',
        `return (${expression});`
      ) as (
        hass: HomeAssistant,
        states: HomeAssistant['states'],
        entity?: string,
        state_attr?: (entityId: string, attribute: string) => unknown
      ) => unknown;
      const entityId = this.config?.entity;
      return fn(this.hass, this.hass?.states, entityId, stateAttr);
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

  private _isTemplate(value?: string): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.startsWith('[[[') && trimmed.endsWith(']]]');
  }

  private _requestCode(): Promise<string | null> {
    if (!this._resolveBoolean(this.config?.keypad_actions, false)) {
      return Promise.resolve(null);
    }
    if (this._keypadPromise) {
      return this._keypadPromise;
    }
    const requiredDigits = this._resolveDigits(this.config?.keypad_digits, 8);
    this._keypadPromise = openKeypadDialog(this, { requiredDigits }).finally(() => {
      this._keypadPromise = undefined;
    });
    return this._keypadPromise;
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
    const requiresCode = this._resolveBoolean(this.config?.keypad_actions, false);
    const code = requiresCode ? await this._requestCode() : null;
    if (requiresCode && code === null) {
      if (clearHoldingOnCancel) {
        this._holding = false;
      }
      return;
    }
    this._handleActionWithCode(action, code);
  }

  private _handleActionWithCode(
    action: 'tap' | 'hold' | 'double_tap',
    code: string | null
  ): void {
    if (!this.hass || !this.config) return;
    const actionConfig = this._getActionConfig(action);
    if (!actionConfig) {
      handleAction(this, this.hass, this.config, action);
      return;
    }
    const normalized = this._normalizeActionConfig(actionConfig);
    const finalConfig = code ? this._injectCode(normalized, code) : normalized;
    handleActionConfig(this, this.hass, this.config, finalConfig as ActionConfig);
  }

  private _getActionConfig(
    action: 'tap' | 'hold' | 'double_tap'
  ): ActionConfig | undefined {
    if (action === 'double_tap') return this.config.double_tap_action;
    if (action === 'hold') return this.config.hold_action;
    return this.config.tap_action;
  }

  private _injectCode(
    actionConfig: ActionConfig,
    code: string
  ): ActionConfig & { code?: string; data?: Record<string, unknown>; service_data?: Record<string, unknown> } {
    const raw = actionConfig as ActionConfig & {
      service?: string;
      data?: Record<string, unknown>;
      service_data?: Record<string, unknown>;
    };
    const serviceData: Record<string, unknown> = {
      ...(raw.data ?? {}),
      ...(raw.service_data ?? {}),
      code,
    };
    if (raw.service === 'script.turn_on') {
      const variables = (serviceData.variables ?? {}) as Record<string, unknown>;
      serviceData.variables = { ...variables, code };
    }
    const enriched: ActionConfig & {
      code?: string;
      data?: Record<string, unknown>;
      service_data?: Record<string, unknown>;
    } = {
      ...actionConfig,
      code,
      data: {
        ...(raw.data ?? {}),
        code,
      },
      service_data: serviceData,
    };
    return enriched;
  }

  private _normalizeActionConfig(actionConfig: ActionConfig): ActionConfig {
    const raw = actionConfig as unknown as {
      action?: string;
      perform_action?: string;
      confirmation?: ActionConfig['confirmation'];
      repeat?: ActionConfig['repeat'];
      haptic?: ActionConfig['haptic'];
      data?: Record<string, unknown>;
      service_data?: Record<string, unknown>;
      target?: Record<string, unknown>;
    };
    const action = raw.action;
    const known = new Set([
      'more-info',
      'navigate',
      'url',
      'toggle',
      'call-service',
      'fire-dom-event',
      'none',
      'toggle-menu',
    ]);
    if (action === 'perform-action' && typeof raw.perform_action === 'string') {
      const base = {
        confirmation: raw.confirmation,
        repeat: raw.repeat,
        haptic: raw.haptic,
      };
      const data = { ...(raw.data ?? {}), ...(raw.service_data ?? {}) };
      return {
        ...base,
        action: 'call-service',
        service: raw.perform_action,
        service_data: data,
        target: raw.target,
      };
    }
    if (typeof action === 'string' && !known.has(action) && action.includes('.')) {
      const base = {
        confirmation: raw.confirmation,
        repeat: raw.repeat,
        haptic: raw.haptic,
      };
      const data = { ...(raw.data ?? {}), ...(raw.service_data ?? {}) };
      return {
        ...base,
        action: 'call-service',
        service: action,
        service_data: data,
        target: raw.target,
      };
    }
    return actionConfig;
  }

  private _resolveDigits(value?: number | string, fallback = 8): number {
    const resolved = this._resolveNumber(value, fallback);
    if (!Number.isFinite(resolved)) return fallback;
    return Math.max(1, Math.min(32, Math.floor(resolved)));
  }

  private _resolveNumber(value?: number | string, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const templated = this._evaluateTemplate(value);
      if (typeof templated === 'number' && Number.isFinite(templated)) return templated;
      if (typeof templated === 'string' && templated.trim() !== '') {
        const parsed = Number(templated);
        if (Number.isFinite(parsed)) return parsed;
      }
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

}
