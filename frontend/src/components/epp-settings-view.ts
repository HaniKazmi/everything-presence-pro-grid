import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import {
	autoDetectionRange,
	getGridRoomMetrics,
} from "../lib/room-geometry.js";
import {
	accordionStyles,
	buttonStyles,
	settingStyles,
	toggleStyles,
	tooltipStyles,
} from "../styles.js";

export interface SensorState {
	occupancy: boolean;
	static_presence: boolean;
	motion_presence: boolean;
	target_presence: boolean;
	illuminance: number | null;
	temperature: number | null;
	humidity: number | null;
	co2: number | null;
}

export class EppSettingsView extends LitElement {
	@property({ attribute: false }) sensorState: SensorState = {
		occupancy: false,
		static_presence: false,
		motion_presence: false,
		target_presence: false,
		illuminance: null,
		temperature: null,
		humidity: null,
		co2: null,
	};

	@property({ type: Boolean }) targetAutoDistance = true;
	@property({ type: Number }) targetMaxDistance = 6.0;
	@property({ type: Boolean }) staticAutoDistance = true;
	@property({ type: Number }) staticMinDistance = 0.3;
	@property({ type: Number }) staticMaxDistance = 16.0;

	@property({ attribute: false }) openAccordions: Set<string> = new Set();

	@property({ attribute: false }) perspective: number[] | null = null;
	@property({ type: Number }) roomWidth = 0;
	@property({ type: Number }) roomDepth = 0;
	@property({ attribute: false }) grid: Uint8Array = new Uint8Array(0);

	@property({ type: Boolean }) saving = false;
	@property({ type: Boolean }) dirty = false;

	@property({ type: Number }) temperatureOffset = 0;
	@property({ type: Number }) humidityOffset = 0;
	@property({ type: Number }) illuminanceOffset = 0;
	@property({ type: Number }) motionTimeout = 5;
	@property({ type: Number }) staticTimeout = 30;
	@property({ type: Number }) staticTriggerThreshold = 3;
	@property({ type: Number }) staticRenewThreshold = 3;
	@property({ type: Number }) staticOnDelay = 0;
	@property({ attribute: false }) entitiesConfig: Record<string, boolean> = {};
	@property({ attribute: false }) logLevels: Record<string, string> = {};
	@property({ type: Boolean }) bluetoothEnabled = false;
	@property({ type: Boolean }) co2Enabled = false;

	// Non-reactive overrides — stores user edits without triggering Lit re-renders.
	// The 5Hz target data stream re-renders the panel at high frequency; if slider
	// handlers update reactive properties, Lit crashes with concurrent re-renders.
	private _overrides: Record<string, any> = {};

	@property({ attribute: false }) localize: (
		key: string,
		params?: Record<string, string | number>,
	) => string = (k) => k;

	static styles = [
		accordionStyles,
		buttonStyles,
		settingStyles,
		toggleStyles,
		tooltipStyles,
		css`
      :host {
        display: block;
      }

      .settings-container {
        width: 560px;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 16px;
        box-sizing: border-box;
      }

      .setting-row ha-select {
        width: 140px;
        flex-shrink: 0;
      }

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
      }
    `,
	];

	render() {
		const sections: { id: string; label: string; icon: string }[] = [
			{
				id: "reporting",
				label: "settings.entities",
				icon: "mdi:format-list-checks",
			},
			{
				id: "detection",
				label: "settings.detection_ranges",
				icon: "mdi:signal-distance-variant",
			},
			{
				id: "sensitivity",
				label: "settings.sensor_calibration",
				icon: "mdi:tune-vertical",
			},
			{
				id: "logging",
				label: "settings.logging",
				icon: "mdi:math-log",
			},
		];

		return html`
      <div class="settings-container">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${sections.map((s) => {
					const open = this.openAccordions.has(s.id);
					return html`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${open} @click=${() => this.toggleAccordion(s.id)}>
                <ha-icon icon=${s.icon}></ha-icon>
                <span class="accordion-title">${this.localize(s.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${open}></ha-icon>
              </button>
              ${
								open
									? html`
                <div class="accordion-body">
                  ${this.renderSettingsSection(s.id)}
                </div>
              `
									: nothing
							}
            </div>
          `;
				})}
        ${this.renderSaveCancelButtons()}
      </div>
    `;
	}

	toggleAccordion(id: string) {
		const newSet = this.openAccordions.has(id)
			? new Set<string>()
			: new Set([id]);
		this.openAccordions = newSet;
		this.dispatchEvent(
			new CustomEvent("accordion-toggle", {
				detail: newSet,
				bubbles: true,
				composed: true,
			}),
		);
	}

	renderSettingsSection(id: string) {
		switch (id) {
			case "detection":
				return this.renderDetectionRanges();
			case "sensitivity":
				return this.renderSensitivities();
			case "reporting":
				return this.renderEntities();
			case "logging":
				return this.renderLogging();
			default:
				return nothing;
		}
	}

	renderEnvOffset(
		label: string,
		reading: number | null,
		offsetKey: string,
		min: number,
		max: number,
		step: number,
		unit: string,
		precision: number,
		tip: string,
		displayMin = -Infinity,
		displayMax = Infinity,
	) {
		const propName = `${offsetKey}Offset` as keyof this;
		const offset = (this as any)[propName] ?? 0;
		// reading already has the saved offset applied by the coordinator,
		// so subtract it to get the raw value
		const raw = reading != null ? reading - offset : null;
		const clamp = (v: number) => Math.max(displayMin, Math.min(displayMax, v));
		const adjusted =
			raw != null ? clamp(raw + offset).toFixed(precision) : "\u2014";
		return html`
      <div class="setting-row">
        <label>${label}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${offsetKey} data-precision=${precision} data-display-min=${displayMin} data-display-max=${displayMax} min=${min} max=${max} step=${step} .value=${String(offset)} @input=${(
					e: Event,
				) => {
					const el = e.target as HTMLInputElement;
					const off = parseFloat(el.value);
					const val =
						raw != null ? clamp(raw + off).toFixed(precision) : "\u2014";
					this._setText(el.nextElementSibling!, val);
					this._overrides[`${offsetKey}Offset`] = off;
					this._fireDirty();
				}} /><span class="setting-value">${adjusted}</span> ${unit}</span>
        ${this.resetBtn(0)}${this.infoTip(tip)}
      </div>
    `;
	}

	/**
	 * Update display text without replacing Lit's tracked text node.
	 * Setting .textContent destroys child nodes and breaks Lit's ChildPart
	 * references, causing "Cannot set properties of null" on the next re-render.
	 */
	private _setText(el: Element, text: string): void {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const node = walker.nextNode();
		if (node) (node as Text).data = text;
		else el.textContent = text;
	}

	private _resetSlider(settingRow: HTMLElement, value: number, key?: string) {
		const slider = settingRow.querySelector(
			".setting-range",
		) as HTMLInputElement;
		if (!slider) return;
		const oldSliderVal = parseFloat(slider.value);
		slider.value = String(value);
		const display = slider.nextElementSibling as HTMLElement;
		if (display) {
			const oldDisplay = parseFloat(display.textContent || "");
			if (slider.dataset.offsetKey && !Number.isNaN(oldDisplay)) {
				// Env offset: display shows adjusted reading (raw + offset).
				// Compute raw from current state and apply new offset.
				const precision = parseInt(slider.dataset.precision ?? "0", 10);
				const dMin = parseFloat(slider.dataset.displayMin ?? "-Infinity");
				const dMax = parseFloat(slider.dataset.displayMax ?? "Infinity");
				const adjusted = Math.max(
					dMin,
					Math.min(dMax, oldDisplay - oldSliderVal + value),
				);
				this._setText(display, adjusted.toFixed(precision));
				this._overrides[`${slider.dataset.offsetKey}Offset`] = value;
			} else {
				this._setText(display, String(value));
			}
		}
		if (key) {
			this._overrides[key] = value;
		}
		// Enable save button directly — no events, no reactive changes
		const btn = this.shadowRoot?.querySelector(
			".save-btn",
		) as HTMLButtonElement;
		if (btn) btn.disabled = false;
	}

	resetBtn(defaultValue: number, key?: string) {
		return html`<button type="button" class="setting-info" aria-label="Reset to default" title="Reset to default" @click=${(
			e: Event,
		) => {
			e.stopPropagation();
			const row = (e.currentTarget as HTMLElement).closest(
				".setting-row",
			) as HTMLElement;
			if (row) this._resetSlider(row, defaultValue, key);
			if (key) {
				this._fireChange(key, defaultValue);
			} else {
				this._fireDirty();
			}
		}}><ha-icon icon="mdi:restart"></ha-icon></button>`;
	}

	infoTip(text: string) {
		return html`<button type="button" class="setting-info" aria-label="Show info" title="Show info"
      @click=${(e: Event) => {
				e.stopPropagation();
				const icon = e.currentTarget as HTMLElement;
				const tip = icon.querySelector(".setting-info-tooltip") as HTMLElement;
				if (!tip) return;
				const wasOpen = tip.style.display === "block";
				// Close any other open tooltips
				this.shadowRoot!.querySelectorAll(".setting-info-tooltip").forEach(
					(t) => {
						(t as HTMLElement).style.display = "none";
					},
				);
				if (wasOpen) return;
				const rect = icon.getBoundingClientRect();
				tip.style.display = "block";
				tip.style.left = `${Math.max(8, Math.min(rect.right - 240, window.innerWidth - 256))}px`;
				tip.style.top = `${rect.bottom + 6}px`;
			}}
    ><ha-icon icon="mdi:help-circle-outline"></ha-icon><span class="setting-info-tooltip">${text}</span></button>`;
	}

	renderDetectionRanges() {
		const autoRange = autoDetectionRange(
			this.roomWidth,
			this.roomDepth,
			this.perspective,
			this.grid,
		);
		const metrics = getGridRoomMetrics(
			this.grid,
			this.roomWidth,
			this.perspective,
		);
		const targetAutoVal = autoRange > 0 ? Math.min(autoRange, 6) : 6;
		const staticMaxAutoVal = autoRange > 0 ? Math.min(autoRange, 16) : 16;
		const targetVal = this.targetAutoDistance
			? targetAutoVal
			: this.targetMaxDistance;
		const staticMaxVal = this.staticAutoDistance
			? staticMaxAutoVal
			: this.staticMaxDistance;
		const autoStyle = "opacity: 0.5; pointer-events: none;";
		return html`
      <div class="settings-section">
        ${metrics ? html`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${metrics.furthestM}m</span></p>` : nothing}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.targetAutoDistance}
                @change=${(e: Event) => {
									const checked = (e.target as HTMLInputElement).checked;
									if (!checked) {
										this._overrides.targetMaxDistance = targetVal;
										this._fireChange("targetMaxDistance", targetVal);
									}
									this._overrides.targetAutoDistance = checked;
									this._fireChange("targetAutoDistance", checked);
								}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoDistance ? autoStyle : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(targetVal)} min="0.5" max="6" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								const v = Number(el.value);
								this._overrides.targetMaxDistance = v;
								this._fireChange("targetMaxDistance", v);
								this._setText(el.nextElementSibling!, v.toFixed(1));
							}} /><span class="setting-value">${targetVal}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(targetAutoVal, "targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.staticAutoDistance}
                @change=${(e: Event) => {
									const checked = (e.target as HTMLInputElement).checked;
									if (!checked) {
										this._overrides.staticMinDistance = 0.3;
										this._fireChange("staticMinDistance", 0.3);
										this._overrides.staticMaxDistance = staticMaxVal;
										this._fireChange("staticMaxDistance", staticMaxVal);
									}
									this._overrides.staticAutoDistance = checked;
									this._fireChange("staticAutoDistance", checked);
								}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance ? autoStyle : ""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance ? 0.3 : this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								const maxD =
									this._overrides.staticMaxDistance ?? this.staticMaxDistance;
								if (v >= maxD) {
									v = Math.round((maxD - 0.1) * 10) / 10;
									el.value = String(v);
								}
								this._overrides.staticMinDistance = v;
								this._fireChange("staticMinDistance", v);
								this._setText(el.nextElementSibling!, v.toFixed(1));
							}} /><span class="setting-value">${this.staticAutoDistance ? 0.3 : this.staticMinDistance}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(0.3, "staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance ? autoStyle : ""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(staticMaxVal)} min="2.4" max="16" step="0.1"
              @input=${(e: Event) => {
								const el = e.target as HTMLInputElement;
								let v = Number(el.value);
								const minD =
									this._overrides.staticMinDistance ?? this.staticMinDistance;
								if (v <= minD) {
									v = Math.round((minD + 0.1) * 10) / 10;
									el.value = String(v);
								}
								this._overrides.staticMaxDistance = v;
								this._fireChange("staticMaxDistance", v);
								this._setText(el.nextElementSibling!, v.toFixed(1));
							}} /><span class="setting-value">${staticMaxVal}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(staticMaxAutoVal, "staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `;
	}

	renderSensitivities() {
		return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.motionTimeout)} min="0" max="120" step="1" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							this._overrides.motionTimeout = Number(el.value);
							this._setText(el.nextElementSibling!, el.value);
							this._fireDirty();
						}} /><span class="setting-value">${this.motionTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(5, "motionTimeout")}${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticTimeout)} min="0" max="120" step="1" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							this._overrides.staticTimeout = Number(el.value);
							this._setText(el.nextElementSibling!, el.value);
							this._fireDirty();
						}} /><span class="setting-value">${this.staticTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(30, "staticTimeout")}${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticTriggerThreshold)} @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							this._overrides.staticTriggerThreshold = Number(el.value);
							this._setText(el.nextElementSibling!, el.value);
							this._fireDirty();
						}} /><span class="setting-value">${this.staticTriggerThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3, "staticTriggerThreshold")}${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticRenewThreshold)} @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							this._overrides.staticRenewThreshold = Number(el.value);
							this._setText(el.nextElementSibling!, el.value);
							this._fireDirty();
						}} /><span class="setting-value">${this.staticRenewThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3, "staticRenewThreshold")}${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.presence_delay")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticOnDelay)} min="0" max="30" step="0.5" @input=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							this._overrides.staticOnDelay = Number(el.value);
							this._setText(el.nextElementSibling!, el.value);
							this._fireDirty();
						}} /><span class="setting-value">${this.staticOnDelay}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(0, "staticOnDelay")}${this.infoTip(this.localize("info.presence_delay"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"), this.sensorState.illuminance, "illuminance", -500, 500, 1, "lux", 1, this.localize("info.illuminance_offset"), 0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"), this.sensorState.humidity, "humidity", -50, 50, 0.1, "%", 1, this.localize("info.humidity_offset"), 0, 100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"), this.sensorState.temperature, "temperature", -20, 20, 0.1, "\u00b0C", 1, this.localize("info.temperature_offset"))}
        </div>
      </div>
    `;
	}

	renderEntities() {
		// Check overrides first, then saved config, then fallback
		const saved: Record<string, boolean> = this.entitiesConfig || {};
		const overrides = this._overrides.entities || {};
		const isOn = (key: string, fallback: boolean) =>
			overrides[key] ?? saved[key] ?? fallback;

		return html`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="room_occupancy" .checked=${isOn("room_occupancy", true)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="room_static_presence" .checked=${isOn("room_static_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="room_motion_presence" .checked=${isOn("room_motion_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="room_target_presence" .checked=${isOn("room_target_presence", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_presence"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.zone_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="zone_presence" .checked=${isOn("zone_presence", true)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_presence"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.xy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="target_xy" .checked=${isOn("target_xy", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.xy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.active")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="target_active" .checked=${isOn("target_active", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.active"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="env_illuminance" .checked=${isOn("env_illuminance", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="env_humidity" .checked=${isOn("env_humidity", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="env_temperature" .checked=${isOn("env_temperature", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${(
							e: Event,
						) => {
							const el = e.target as HTMLInputElement;
							const key = el.dataset.entityKey!;
							if (!this._overrides.entities) this._overrides.entities = {};
							this._overrides.entities[key] = el.checked;
							this._fireDirty();
						}} data-entity-key="env_co2" .checked=${isOn("env_co2", false)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `;
	}

	renderLogging() {
		const LOG_LEVELS = ["None", "Error", "Warning", "Info", "Debug"];
		const categories: { key: string; label: string; tip: string; show: boolean }[] = [
			{ key: "system", label: "settings.log_system", tip: "info.log_system", show: true },
			{ key: "epp", label: "settings.log_epp", tip: "info.log_epp", show: true },
			{ key: "led", label: "settings.log_led", tip: "info.log_led", show: true },
			{ key: "networking", label: "settings.log_networking", tip: "info.log_networking", show: true },
			{ key: "ble", label: "settings.log_ble", tip: "info.log_ble", show: this.bluetoothEnabled },
			{ key: "co2", label: "settings.log_co2", tip: "info.log_co2", show: this.co2Enabled },
		];

		return html`
      <div class="settings-section">
        <div class="setting-group">
          ${categories.filter(c => c.show).map((c) => {
						const overrides = this._overrides.logLevels || {};
						const current = overrides[c.key] ?? this.logLevels[c.key] ?? "Warning";
						return html`
              <div class="setting-row">
                <label>${this.localize(c.label)}</label>
                <ha-select
                  .value=${current}
                  .options=${LOG_LEVELS.map((l) => ({ value: l, label: l }))}
                  @selected=${(e: CustomEvent<{ value: string }>) => {
										const val = e.detail.value;
										if (!val || val === current) return;
										if (!this._overrides.logLevels) this._overrides.logLevels = {};
										this._overrides.logLevels[c.key] = val;
										this._fireDirty();
										this.requestUpdate();
									}}
                  @closed=${(e: Event) => e.stopPropagation()}
                ></ha-select>
                <button type="button" class="setting-info" aria-label="Reset to default" title="Reset to default" @click=${(e: Event) => {
									e.stopPropagation();
									if (!this._overrides.logLevels) this._overrides.logLevels = {};
									this._overrides.logLevels[c.key] = "Warning";
									this._fireDirty();
									this.requestUpdate();
								}}><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(c.tip))}
              </div>
            `;
					})}
        </div>
      </div>
    `;
	}


	renderSaveCancelButtons() {
		return html`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${() => {
						this.dispatchEvent(
							new CustomEvent("cancel", {
								bubbles: true,
								composed: true,
							}),
						);
					}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn"
          ?disabled=${this.saving || !this.dirty}
          @click=${() => {
						this._emitSave();
					}}
        >${this.saving ? this.localize("common.saving") : this.localize("common.save")}</button>
      </div>
    `;
	}

	private _emitSave() {
		const o = this._overrides;
		const entities = { ...this.entitiesConfig, ...(o.entities || {}) };

		this.dispatchEvent(
			new CustomEvent("save", {
				detail: {
					target_auto_distance: o.targetAutoDistance ?? this.targetAutoDistance,
					target_max_distance: o.targetMaxDistance ?? this.targetMaxDistance,
					static_auto_distance: o.staticAutoDistance ?? this.staticAutoDistance,
					static_min_distance: o.staticMinDistance ?? this.staticMinDistance,
					static_max_distance: o.staticMaxDistance ?? this.staticMaxDistance,
					motion_timeout: o.motionTimeout ?? this.motionTimeout,
					static_timeout: o.staticTimeout ?? this.staticTimeout,
					static_trigger_threshold:
						o.staticTriggerThreshold ?? this.staticTriggerThreshold,
					static_renew_threshold:
						o.staticRenewThreshold ?? this.staticRenewThreshold,
					static_on_delay: o.staticOnDelay ?? this.staticOnDelay,
					temperature_offset: o.temperatureOffset ?? this.temperatureOffset,
					humidity_offset: o.humidityOffset ?? this.humidityOffset,
					illuminance_offset: o.illuminanceOffset ?? this.illuminanceOffset,
					entities,
					log_levels: {
						...this.logLevels,
						...(o.logLevels || {}),
					},
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private _fireChange(key: string, value: unknown) {
		this.dispatchEvent(
			new CustomEvent("setting-change", {
				detail: { key, value },
				bubbles: true,
				composed: true,
			}),
		);
		this._fireDirty();
	}

	private _fireDirty() {
		// Enable save button directly via DOM — setting reactive properties
		// here crashes Lit when combined with the panel's 5Hz re-renders.
		const btn = this.shadowRoot?.querySelector(
			".save-btn",
		) as HTMLButtonElement;
		if (btn) btn.disabled = false;
		this.dispatchEvent(
			new CustomEvent("dirty", {
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("epp-settings-view")) {
	customElements.define("epp-settings-view", EppSettingsView);
}
