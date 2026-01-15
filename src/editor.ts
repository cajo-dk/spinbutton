/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, unsafeCSS, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
import { loadHaComponents } from '@kipk/load-ha-components';
import editorCss from './editor.css';
import { DEFAULT_CONFIG, LAYOUT_OPTIONS, STOP_OPTIONS } from './const';

type LayoutOption = (typeof LAYOUT_OPTIONS)[number];
type StopOption = (typeof STOP_OPTIONS)[number];

interface SpinbuttonCardConfig extends LovelaceCardConfig {
  name?: string;
  entity?: string;
  icon?: string;
  icon_size?: number;
  layout?: LayoutOption;
  radius?: number;
  ring_width?: number;
  card_width?: number | string;
  card_height?: number | string;
  stops?: StopOption;
  speed?: number;
  background?: string | [number, number, number] | { r: number; g: number; b: number };
  icon_color?: string | [number, number, number] | { r: number; g: number; b: number };
  animation?: boolean;
  show_ring?: boolean;
  custom_css?: string;
  confirm_actions?: boolean;
  tap_action?: any;
  hold_action?: any;
  double_tap_action?: any;
}

@customElement('spinbutton-editor')
export class SpinbuttonEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() private _config?: SpinbuttonCardConfig;
  @state() private _activeTab = 0;

  public setConfig(config: SpinbuttonCardConfig): void {
    this._config = { ...config };
    this.requestUpdate();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void loadHaComponents(['ha-tab', 'ha-ripple']);
  }

  protected render(): TemplateResult {
    const layout = this._normalizeValue(this._config?.layout, LAYOUT_OPTIONS, 'icon_name_h');
    const stops = this._normalizeValue(this._config?.stops, STOP_OPTIONS, 'multi');
    const background = this._normalizeColorText(this._config?.background ?? '#1C1F2B');
    const iconColor = this._normalizeColorText(this._config?.icon_color ?? '#FFFFFF');
    const data: SpinbuttonCardConfig = {
      ...this._defaultConfig(),
      ...(this._config ?? {}),
      layout,
      stops,
      background,
      icon_color: iconColor,
      type: 'custom:spinbutton-card',
    };
    const tabs = ['Card', 'Layout', 'Custom CSS'] as const;
    return html`
      <div class="card-config">
        <div
          class="tab-bar"
          role="tablist"
          aria-label="Spinbutton editor tabs"
        >
          ${tabs.map(
            (label, index) => html`
              <ha-tab
                .name=${label}
                .active=${this._activeTab === index}
                .narrow=${false}
                data-index=${index}
                @click=${this._handleTabClick}
              ></ha-tab>
            `
          )}
        </div>
        <div class="tab-content">
          ${this._activeTab === 0
            ? html`
                <ha-form
                  .hass=${this.hass}
                  .data=${data}
                  .schema=${this._buildCardSchema()}
                  .computeLabel=${this._computeLabel}
                  @value-changed=${this._handleFormValueChanged}
                ></ha-form>
              `
            : ''}
          ${this._activeTab === 1
            ? html`
                <ha-form
                  .hass=${this.hass}
                  .data=${data}
                  .schema=${this._buildLayoutSchema()}
                  .computeLabel=${this._computeLabel}
                  @value-changed=${this._handleFormValueChanged}
                ></ha-form>
              `
            : ''}
          ${this._activeTab === 2
            ? html`
                <ha-form
                  .hass=${this.hass}
                  .data=${data}
                  .schema=${this._buildCustomCssSchema()}
                  .computeLabel=${this._computeLabel}
                  @value-changed=${this._handleFormValueChanged}
                ></ha-form>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private _handleFormValueChanged(ev: CustomEvent): void {
    const value = ev.detail?.value as SpinbuttonCardConfig | undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }
    const layout = this._normalizeValue(
      value.layout ?? this._config?.layout,
      LAYOUT_OPTIONS,
      'icon_name_h'
    );
    const stops = this._normalizeValue(
      value.stops ?? this._config?.stops,
      STOP_OPTIONS,
      'multi'
    );
    this._config = {
      ...(this._config ?? { type: 'custom:spinbutton-card' }),
      ...value,
      layout,
      stops,
      type: 'custom:spinbutton-card',
    };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _defaultConfig(): SpinbuttonCardConfig {
    return { ...DEFAULT_CONFIG };
  }

  private _buildCardSchema(): any[] {
    return [
      {
        type: 'grid',
        name: 'card',
        column_min_width: '200px',
        schema: [
          { name: 'name', selector: { text: {} } },
          { name: 'entity', selector: { entity: {} } },
          { name: 'icon', selector: { icon: {} } },
          {
            name: 'icon_size',
            selector: {
              number: {
                min: 8,
                max: 256,
                step: 1,
                unit_of_measurement: 'px',
                mode: 'box',
              },
            },
          },
          { name: 'tap_action', selector: { ui_action: {} } },
          { name: 'confirm_actions', selector: { boolean: {} } },
          { name: 'double_tap_action', selector: { ui_action: {} } },
          { name: 'hold_action', selector: { ui_action: {} } },
        ],
        flatten: true,
      },
    ];
  }

  private _buildLayoutSchema(): any[] {
    const stopOptions = STOP_OPTIONS.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    }));
    const layoutOptions = [
      { value: 'icon_name_h', label: 'Icon, Name (Hor.)' },
      { value: 'icon_name_state', label: 'Icon, Name, State' },
      { value: 'icon_name_v', label: 'Icon, Name (Vert.)' },
      { value: 'upper_left', label: 'Icon top left' },
      { value: 'custom_css', label: 'Custom CSS' },
    ];
    return [
      {
        type: 'grid',
        name: 'layout',
        column_min_width: '200px',
        schema: [
          { name: 'card_width', selector: { text: {} } },
          { name: 'card_height', selector: { text: {} } },
          {
            name: 'layout',
            selector: {
              select: {
                options: layoutOptions,
                mode: 'dropdown',
              },
            },
          },
          { name: 'background', selector: { text: {} } },
          {
            name: 'radius',
            selector: {
              number: { min: 0, max: 100, step: 1, unit_of_measurement: 'px', mode: 'box' },
            },
          },
          {
            name: 'ring_width',
            selector: {
              number: { min: 0, max: 20, step: 1, unit_of_measurement: 'px', mode: 'box' },
            },
          },
          {
            name: 'speed',
            selector: {
              number: { min: 0.5, max: 10, step: 0.1, unit_of_measurement: 's', mode: 'box' },
            },
          },
          {
            name: 'stops',
            selector: {
              select: {
                options: stopOptions,
                mode: 'dropdown',
              },
            },
          },
          { name: 'show_ring', selector: { boolean: {} } },
          { name: 'animation', selector: { boolean: {} } },
        ],
        flatten: true,
      },
    ];
  }

  private _buildCustomCssSchema(): any[] {
    return [
      {
        type: 'grid',
        name: 'custom_css',
        column_min_width: '200px',
        schema: [
          {
            name: 'custom_css',
            selector: {
              text: {
                multiline: true,
              },
            },
          },
        ],
        flatten: true,
      },
    ];
  }

  private _buildActionsSchema(): any[] {
    return [
      { name: 'tap_action', selector: { action: {} } },
      { name: 'hold_action', selector: { action: {} } },
      { name: 'double_tap_action', selector: { action: {} } },
    ];
  }


  private _normalizeValue<T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T
  ): T {
    const isAllowed = (candidate: unknown): candidate is T =>
      typeof candidate === 'string' && (allowed as readonly string[]).includes(candidate);

    if (isAllowed(value)) {
      return value;
    }
    if (value && typeof value === 'object' && 'value' in value) {
      const raw = (value as { value?: unknown }).value;
      if (raw && typeof raw === 'object' && 'value' in raw) {
        const nested = (raw as { value?: unknown }).value;
        return isAllowed(nested) ? nested : fallback;
      }
      return isAllowed(raw) ? raw : fallback;
    }
    if (value && typeof value === 'object' && 'id' in value) {
      const raw = (value as { id?: unknown }).id;
      return isAllowed(raw) ? raw : fallback;
    }
    return fallback;
  }

  private _normalizeColorText(
    value: SpinbuttonCardConfig['background']
  ): string {
    if (Array.isArray(value) && value.length >= 3) {
      return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
    }
    if (value && typeof value === 'object') {
      const { r, g, b } = value as { r?: number; g?: number; b?: number };
      if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    if (typeof value === 'string') {
      return value;
    }
    return '';
  }

  private _computeLabel = (schema: { name: string }): string => {
    const labels: Record<string, string> = {
      name: 'Name',
      entity: '',
      icon: 'Icon',
      icon_size: 'Icon Size (px)',
      layout: 'Layout',
      custom_css: 'Custom CSS',
      radius: 'Radius',
      ring_width: 'Ring Width',
      card_width: 'Card Width',
      card_height: 'Card Height',
      stops: 'Stops',
      speed: 'Speed (s)',
      background: 'Background',
      icon_color: 'Icon Color',
      animation: 'Animation',
      show_ring: 'Show Ring',
      tap_action: 'Tap Action',
      hold_action: 'Hold Action',
      double_tap_action: 'Double Tap Action',
      confirm_actions: 'Confirm Actions',
    };
    return labels[schema.name] ?? schema.name;
  };

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(editorCss)}
    `;
  }

  private _selectTab(index: number): void {
    if (this._activeTab === index) return;
    const prev = this._activeTab;
    this._activeTab = index;
    this.requestUpdate('_activeTab', prev);
  }

  private _handleTabClick(ev: Event): void {
    const tab = ev.currentTarget as HTMLElement | null;
    if (!tab) return;
    const index = Number(tab.dataset.index);
    if (Number.isNaN(index)) return;
    this._selectTab(index);
  }
}
