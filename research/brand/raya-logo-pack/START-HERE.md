# Raya London logo pack

Open `preview.html` to see the full collection. The PNG preview is also included if you prefer a single image.

The eye, ear, pencil and lips have been redrawn, keeping their order and the cyan, lime, yellow and red palette. The name now reads RAYA LONDON, with TRAINING CENTRE underneath. Glass reflections and thinner rims replace the original heavy silver outlines.

## Which file to use

| Use | File |
| --- | --- |
| Main logo on a dark background | `svg/raya-glass-dark.svg` |
| Main logo on a light background | `svg/raya-glass-light.svg` |
| Wide website header | `svg/raya-glass-horizontal-dark.svg` or its light equivalent |
| Small website header | `svg/raya-compact-dark.svg` or its light equivalent |
| Print and simple reproduction | `svg/raya-flat-light.svg` |
| Single colour | `svg/raya-mono-light.svg` or its dark equivalent |
| Four symbols without lettering | `svg/raya-glass-symbols.svg` or `svg/raya-flat-symbols.svg` |
| Documents and image uploads | Matching transparent PNG in `png/` |
| Social profile | `png/raya-profile-dark-1080.png` or the light version |

“Dark” means the artwork is intended to sit on a dark background and has light lettering. “Light” has dark lettering. The SVG and regular PNG files have transparent backgrounds. The two profile pictures have solid backgrounds.

## Editable artwork

SVG is a vector format, which means the artwork stays sharp when enlarged. Every symbol and letter is drawn as shapes, with no embedded photograph and no font installation required. Open an SVG in a vector editor to change its colours, size or individual shapes. The glass versions use editable gradients and transparency. The single-colour versions use masks to cut transparent symbols out of the circles.

The PNGs are image exports at 2,048 and 4,096 pixels wide. They are convenient for uploads but do not replace the SVG masters. The profile pictures are 1,080 × 1,080 pixels.

For print, start with the flat SVG. Ask the printer to convert the colours to suit their printing process and check a proof. These files use screen colours and are not a press-specific colour proof. For cutting or embroidery, the production supplier should expand strokes and masks to suit their equipment.

## Passing this to Claude Code

Give Claude Code the whole ZIP if its interface accepts files. Otherwise extract it into your website project and point Claude Code to `CLAUDE-CODE-HANDOVER.md`. Keeping the pack together avoids losing the images that the code refers to.

The SVG image embed is the simplest website option. For a surface that visibly lets the background show through, use `web/raya-logo.js`, which contains the live glass component. A React example is included in `web/RayaLogo.tsx`.

The website examples are ready to integrate, but the final website still needs checking in its own layout. Nothing has been published or installed on a website.

Original source artwork is preserved in `reference/original-logo.png`.
