# Spinbutton Card

A Home Assistant custom card that shows a spinning ring with an icon, name, and state. It supports multiple layouts, custom CSS, optional ring/animation, and standard Lovelace tap/hold/double-tap actions with confirmation.

## Installation

1) Build the card.
```
npm install
npm run build
```
By default the build outputs to the folder set in `rollup.config.mjs` (currently `H:/www/spinbutton`). Update that path to your Home Assistant `config/www/spinbutton` folder or copy the built files there.

2) Add the resource in Home Assistant.
- Settings -> Dashboards -> Resources -> Add Resource
- URL: `/local/spinbutton/spinbutton.js`
- Type: `JavaScript Module`

3) Add the card to a dashboard.
```
type: custom:spinbutton-card
entity: light.kitchen
name: Kitchen
```

## Configuration

Example:
```
type: custom:spinbutton-card
entity: light.kitchen
name: Kitchen
icon: mdi:rotate-right
icon_size: 32
icon_color: "#FFFFFF"
layout: icon_name_h
radius: 8
ring_width: 2
card_width: 150px
card_height: 100
stops: multi
speed: 2.5
background: "rgba(199, 159, 209, 0.5)"
animation: true
show_ring: true
custom_css: ""
tap_action:
  action: toggle
hold_action:
  action: more-info
double_tap_action:
  action: none
confirm_actions: false
```

### Options

- `type`: `custom:spinbutton-card` (required).
- `entity`: Entity ID shown on the card.
- `name`: Override for the displayed name.
- `icon`: Override for the icon (defaults to entity icon or `mdi:rotate-right`).
- `icon_size`: Icon size in pixels. Default: `32`.
- `icon_color`: Icon color as a CSS color string (hex, rgb/rgba, etc). Default: `#FFFFFF`.
- `layout`: Layout for icon/name/state. Options: `icon_name_h`, `icon_name_state`, `icon_name_v`, `custom_css`. Default: `icon_name_h`.
- `radius`: Card corner radius in pixels. Default: `8`.
- `ring_width`: Ring border width in pixels. Default: `2`.
- `card_width`: Card width in pixels or CSS length. Default: `150px`.
- `card_height`: Card height in pixels. Default: `100`.
- `stops`: Ring gradient preset. Options: `multi`, `blue`, `red`, `green`, `orange`, `yellow`, `none`. Default: `multi`.
- `speed`: Spin speed in seconds. Default: `2.5`.
- `background`: Card background as a CSS color string or RGB tuple/object. Default: `#1C1F2B`.
- `animation`: Enable/disable spinning animation. Default: `true`.
- `show_ring`: Show/hide the ring. Default: `true`.
- `custom_css`: Raw CSS injected into the card (used with `layout: custom_css`).
- `tap_action`: Lovelace tap action.
- `hold_action`: Lovelace hold action.
- `double_tap_action`: Lovelace double-tap action.
- `confirm_actions`: Prompt before performing actions. Default: `false`.

## Features

- Layouts: `icon_name_h`, `icon_name_state`, `icon_name_v`, `upper_left`, and `custom_css`.
- Ring presets: `multi`, `blue`, `red`, `green`, `orange`, `yellow`, `none`.
- Custom sizes: width/height can be numbers or CSS lengths.
- Custom colors: `background` and `icon_color` accept CSS strings or `{ r, g, b }` / `[r, g, b]`.
- Optional animation and ring visibility toggles.
- Action confirmation dialog styled to match the card.

## Templating

Some fields accept template strings in the form `[[[ ... ]]]` and are evaluated with `hass`, `states`, and `entity` in scope. This is supported for `background`, `icon_color`, `stops`, and boolean fields like `animation` and `show_ring`.
