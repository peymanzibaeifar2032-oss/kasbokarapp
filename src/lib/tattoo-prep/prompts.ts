export type PrepTask = "design" | "extract" | "stencil" | "enhance";
export type StencilKind = "outline" | "shading" | "hatching";

const PAPER =
  "Pure flat white background. No paper texture, no border, no frame, no watermark, no letters, no signature, no skin, no arm, no body, no hands, no photo mockup.";

function versionLine(variation?: number) {
  if (!variation) return "";
  return ` This is alternative ${variation}. Keep the same subject and the same layout. Change only small line choices so the version is distinct and still usable on skin.`;
}

export function prepPrompt(input: {
  task: PrepTask;
  idea?: string;
  style?: string;
  colorMode?: string;
  stencilMode?: StencilKind;
  variation?: number;
}) {
  const idea = (input.idea || "").trim();
  const style = (input.style || "").trim();
  if (input.task === "enhance") {
    return [
      "Professionally restore this photograph.",
      "Raise sharpness, micro-detail, and clarity of the tattoo and the skin.",
      "Fix blur, noise, dull light, and harsh color casts.",
      "Keep the exact same person, pose, tattoo, crop, and framing.",
      "Do not redraw it as an illustration. Do not change the design. Do not add text, a watermark, or new objects.",
      "The result is a clean high-resolution photo of the same tattoo.",
    ].join(" ");
  }
  if (input.task === "extract") {
    return [
      "Extract only the tattoo artwork from the reference photograph.",
      "Remove the arm, skin, body, clothing, background, camera light, and photo grain.",
      "Redraw that tattoo as a finished, highly detailed black-and-grey design sheet a professional tattooer can stencil today.",
      "Every form is fully drawn and sharp: trees, mountains, animals, water, rocks, faces, ornaments, or whatever is actually in the tattoo.",
      "Not a rough doodle, not a blurry photo, not a few thick outlines, not empty space.",
      "Depth is fine stipple and controlled grey. No muddy airbrush fog.",
      "Centered, with a clean white margin. Keep the tattoo's own proportions.",
      PAPER,
      idea ? `Subject note, only if it matches the photo: ${idea}.` : "Stay faithful to the tattoo in the photo. Do not invent a different scene.",
      versionLine(input.variation),
    ].join(" ");
  }
  if (input.task === "stencil") {
    const kind =
      input.stencilMode === "outline"
        ? "STENCIL TYPE outline: clean closed contour lines only. No fill, no dots, no hatching, no grey. Line weight is even and thick enough to tattoo."
        : input.stencilMode === "hatching"
          ? "STENCIL TYPE hatching: crisp contour lines plus fine parallel and cross-hatch lines in every shadow. No grey wash, no smooth gradient, no stipple."
          : "STENCIL TYPE shading: crisp contour lines plus dense stipple dots in every shadow. Dots are tight in dark areas and sparse in light areas. No grey wash and no smooth gradient.";
    return [
      "Convert the reference into a precise thermal-transfer tattoo stencil for a stencil printer.",
      "Black ink only on pure white. The paper must stay pure white.",
      kind,
      "Detail of a complex professional stencil: every needle of a pine, rock edge, hair, or ornament is a clean printer line.",
      "Not a photograph, not a crude edge filter, not a sparse sketch.",
      "No skin, no arm, no body, no extra color, no watermark, no letters, no drop shadow.",
      "Leave a small white margin and keep the artwork's proportions.",
      PAPER,
      idea ? `Subject note: ${idea}.` : "Stay faithful to the artwork in the reference.",
      versionLine(input.variation),
    ].join(" ");
  }
  const color =
    input.colorMode === "color"
      ? "Limited tattoo color may sit inside the forms. Shadows stay crisp, not airbrush fog."
      : "Black and grey ink only.";
  return [
    "Professional tattoo design sheet on pure white, finished enough to stencil the same day.",
    "Fully drawn forms, sharp readable lines, rich controlled shading.",
    "Not a rough doodle, not a photograph, not a mockup on skin, not a sparse sketch.",
    style ? `Style: ${style}.` : "Style: highly detailed black and grey tattoo design.",
    color,
    PAPER,
    `Idea: ${idea || "a custom tattoo design"}`,
    versionLine(input.variation),
  ].join(" ");
}
