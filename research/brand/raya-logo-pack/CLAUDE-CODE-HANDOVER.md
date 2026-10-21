# Raya London website handover

Integrate the supplied Raya London logo into the existing website. Inspect the project before choosing an implementation. Use the supplied artwork without recreating or tracing it.

## Identity to preserve

- Name: Raya London Training Centre.
- Symbols, left to right: eye, ear, pencil, lips.
- Base colours: cyan `#00ADDC`, lime `#9DCC36`, yellow `#EBC300`, red `#E40035`.
- Main arrangement: four circles above RAYA LONDON, with TRAINING CENTRE underneath.
- The compact version deliberately omits the descriptor to improve readability in smaller spaces. Its accessible name still includes Training Centre.
- Preserve proportions, spacing and the supplied letter shapes. Do not substitute a font or recolour individual symbols to match an unrelated website palette.

## Recommended implementation

Use the external SVG image for navigation and routine placements. It scales cleanly, carries the glass appearance with no scripts, and has no external font dependency. All lettering is outlined, meaning it is stored as shapes.

Copy the contents of `svg/` to the project's static asset folder, such as `public/raya/`. Adapt the URL prefix to the framework and any deployment subdirectory.

```html
<a href="/" aria-label="Raya London home">
  <img
    src="/raya/raya-glass-dark.svg"
    alt="Raya London Training Centre"
    width="536"
    height="256"
    style="display:block;width:320px;max-width:100%;height:auto"
  >
</a>
```

The width and height attributes reserve the correct proportions while the CSS sets the displayed size. Retain the existing home route if it differs from `/`.

Choose `dark` for a dark background and `light` for a light background. These names describe the background, not the lettering. The SVGs themselves have transparent backgrounds.

For a tight mobile header, use `raya-compact-dark.svg` or `raya-compact-light.svg`, with width `536` and height `220`. Start at 240–280 displayed pixels wide and check the result in the actual header. For the full logo, allow around 360 pixels where possible, since the descriptor is deliberately smaller. Below this, prefer the compact version. The symbols-only SVG has width `536` and height `144` and can be used alongside an accessible text name.

The wide header variants have width `1000` and height `144`. Use them only where there is enough space for the small descriptor to remain readable. Do not force that version into a narrow mobile header.

For React projects, `web/RayaLogo.tsx` provides an image component using the primary SVGs. It assumes `public/raya/` as the asset location. Adjust that path for the project. Its `width` prop controls the displayed width. Do not import browser-only custom-element code during server rendering.

## Optional live glass

`web/raya-logo.js` provides a reusable browser element. It includes its own vector symbols, lettering and styles, with no libraries or network requests. CSS, the browser's styling language, supplies the translucent lenses and reflections. A backdrop blur softens what is behind the lenses while keeping the symbols sharp.

```html
<script src="/raya/raya-logo.js" defer></script>
<raya-logo
  theme="dark"
  style="width:360px;max-width:100%"
  role="img"
  aria-label="Raya London Training Centre"
></raya-logo>
```

Copy `web/raya-logo.js` to the indicated public path. This component is self-contained and does not fetch the SVG files. Load it once. In a React or other server-rendered project, register it from the project's client-side entry or use the ordinary SVG image component instead.

Set `theme="light"` for dark lettering. Add the boolean `flat` attribute to remove the glass effects. The element does not animate, so no motion effect needs disabling. It includes solid-colour fallbacks for increased contrast and reduced transparency, and a system-colour treatment for forced-colour mode. Unsupported backdrop blur falls back to opaque gradients.

The live component and the static SVG use the same underlying symbols and lettering. Their reflections differ slightly because the live component is drawn by browser styles and allows the page background to show through. Neither version is a physically accurate optical simulation. Use the static SVG where consistent reproduction matters most.

Keep the region behind the logo calm and avoid placing it over text, busy photography or moving video. Use a separate flat or SVG fallback if scripts are disabled. If the logo links home, wrap it in an anchor with a visible keyboard focus style; the artwork itself is not a button.

## Files and editing

- `svg/`: twelve editable vector files, including glass, flat, monochrome, compact and horizontal versions.
- `png/`: matching exports at 2,048 and 4,096 pixels wide, plus two 1,080-pixel profile images.
- `web/raya-logo.js`: optional live glass component.
- `web/RayaLogo.tsx`: React image component.
- `web/embed-example.html`: working standalone integration examples.
- `preview.html`: visual reference for the intended result.
- `reference/original-logo.png`: the original, for comparison only.

Keep the source SVGs in the repository. Preserve `viewBox`, gradient identifiers and masks. External image embeds keep identifiers isolated. If inserting SVG markup inline more than once, give all internal IDs a unique prefix for each instance and update every reference. The live component uses an isolated shadow tree and can be repeated safely.

Do not flatten a PNG into an SVG wrapper and describe it as vector. Do not replace the supplied SVG with a screenshot of the preview sheet.

## Checks before handover

1. Check the existing framework, asset paths, header dimensions, dark/light theme handling and content security rules.
2. Confirm the image loads without layout jumps or stretching and the home link uses the correct route.
3. Check the actual header at 390 pixels wide and on desktop. Use the compact version where the descriptor becomes too small.
4. Keep the accessible name exactly “Raya London Training Centre”. Avoid duplicate spoken labels from decorative copies.
5. Check keyboard focus, light and dark backgrounds, increased contrast, reduced transparency and forced colours if using live glass.
6. Confirm there are no missing assets or browser errors, and run the project's normal relevant checks.
7. Present the integrated local preview and report any limitations. Do not deploy or publish unless separately instructed.

## Verification scope

The pack was rendered locally in Microsoft Edge. Its standalone preview and web component were checked on desktop and at 390 pixels wide. The forced-colour treatment was visually checked. SVGs were checked for embedded raster images, font-based text and scripts; none are present. PNG exports were rendered from the SVG masters.

The React example has not been compiled within your website. Safari, Firefox, physical print output and the target site's security settings have not been tested. Check them as relevant during integration.
