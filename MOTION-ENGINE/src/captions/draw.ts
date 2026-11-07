/**
 * Pustaka gambar caption: subtitle, gelembung percakapan/pikiran,
 * antarmuka chat, kinetic typography, anotasi melayang, data caption,
 * impact, fullscreen typography, split, side annotation, dan instruction.
 * Setiap fungsi murni menggambar ke ctx pada kotak penempatan yang sudah
 * diselesaikan solver; mengembalikan rect okupasi untuk anti-tumpukan.
 */
import { CaptionThemeTokens, themeAlpha } from "./theme";
import { Metrics, RectPx, measureBlock, fontSizeOf } from "./layout";
import { CaptionAnimState } from "./anim";
import { WordTiming, activeWordIndex, charTimings } from "./sync";
import { AnchorBox, CaptionType, ChatMessage } from "./adaptive-types";
import { luminance } from "../color/palette";
import { isAccentWord } from "./renderer";

export interface ResolvedCaption {
  id: string;
  sceneId: string;
  text: string;
  type: CaptionType;
  placement: string;
  animation: string;
  theme: CaptionThemeTokens;
  emphasis: string[];
  messages?: ChatMessage[];
  variant?: string;
  style?: string;
  /** Waktu scene-lokal mulai/berakhir. */
  at: number;
  duration: number;
  intensity: number;
  /** Sinkronisasi kata (waktu absolut timeline) bila menempel cue. */
  words?: WordTiming[];
  cueBound: boolean;
  maxLines: number;
  sender?: string;
}

export interface DrawCall {
  ctx: any;
  m: Metrics;
  cap: ResolvedCaption;
  anim: CaptionAnimState;
  rect: RectPx;
  anchorPx: RectPx | null;
  localT: number;
  tAbs: number;
}

const FONT_MIN = 34;
const FONT_SUBTITLE = 52;
const FONT_BUBBLE = 42;
const FONT_CHAT = 34;
const FONT_KINETIC = 78;
const FONT_ANNOTATION = 32;
const FONT_IMPACT = 128;
const FONT_FULLSCREEN = 104;

function setFont(ctx: any, weight: string, size: number, family: string, spacing = 0): void {
  ctx.font = weight + " " + Math.max(8, Math.round(size)) + 'px "' + family + '", sans-serif';
  try {
    ctx.letterSpacing = spacing.toFixed(2) + "px";
  } catch {
    /* letterSpacing tidak didukung build ini */
  }
}

function resetSpacing(ctx: any): void {
  try {
    ctx.letterSpacing = "0px";
  } catch {
    /* noop */
  }
}

function roundRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawPillShape(ctx: any, x: number, y: number, w: number, h: number, theme: CaptionThemeTokens, alpha: number): void {
  ctx.save();
  if (theme.shadowBlur > 0) {
    ctx.shadowColor = themeAlpha("#000000", 0.45 * alpha);
    ctx.shadowBlur = theme.shadowBlur;
    ctx.shadowOffsetY = theme.shadowOffsetY;
  }
  if (theme.backgroundAlpha > 0) {
    ctx.fillStyle = themeAlpha(theme.backgroundColor, theme.backgroundAlpha * alpha);
    roundRectPath(ctx, x, y, w, h, theme.borderRadius);
    ctx.fill();
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (theme.borderWidth > 0) {
    ctx.strokeStyle = themeAlpha(theme.borderColor, alpha);
    ctx.lineWidth = theme.borderWidth;
    roundRectPath(ctx, x, y, w, h, theme.borderRadius);
    ctx.stroke();
  }
  ctx.restore();
}

function isEmphasisWord(word: string, emphasis: string[]): boolean {
  if (emphasis.some((e) => word.toLowerCase().includes(e.toLowerCase()))) return true;
  return isAccentWord(word);
}

function drawLinesWithAccent(
  ctx: any,
  call: DrawCall,
  lines: string[],
  fontSize: number,
  lineHeight: number,
  x: number,
  y: number,
  align: "left" | "center" | "right",
  width: number,
  revealChars: number
): void {
  const { cap, anim, theme } = call;
  const accentUsable = luminance(theme.accentColor) >= 0.18 || theme.backgroundAlpha < 0.2;
  const activeIdx = cap.words && cap.words.length > 0 ? activeWordIndex(cap.words, call.tAbs) : -1;
  let wordCounter = 0;
  let charCursor = 0;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  for (let li = 0; li < lines.length; li++) {
    const lineY = y + lineHeight * li + lineHeight / 2;
    const line = lines[li];
    const lineWidth = ctx.measureText(line).width;
    let cursor = align === "center" ? x + (width - lineWidth) / 2 : align === "right" ? x + width - lineWidth : x;
    const words = line.split(" ");
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const wWidth = ctx.measureText(word).width;
      const spaceWidth = wi < words.length - 1 ? ctx.measureText(" ").width : 0;
      let visible = word;
      if (revealChars >= 0) {
        const remaining = revealChars - charCursor;
        if (remaining <= 0) {
          charCursor += word.length + 1;
          wordCounter++;
          cursor += wWidth + spaceWidth;
          continue;
        }
        if (remaining < word.length) visible = word.slice(0, Math.max(0, remaining));
      }
      charCursor += word.length + 1;
      const globalWordIdx = wordCounter;
      wordCounter++;
      const isActive = activeIdx >= 0 && globalWordIdx === activeIdx;
      const isEmph = isEmphasisWord(word, cap.emphasis);
      ctx.fillStyle = isActive
        ? themeAlpha(theme.accentColor, anim.alpha)
        : isEmph && accentUsable
          ? themeAlpha(theme.accentColor, anim.alpha)
          : themeAlpha(theme.textColor, anim.alpha);
      ctx.textAlign = "left";
      if (visible.length > 0) ctx.fillText(visible, cursor, lineY);
      cursor += wWidth + spaceWidth;
    }
  }
  ctx.textAlign = align;
}

/** Subtitle keluarga pil (subtitle/top/center/corner/floating/left/right). */
function drawPillSubtitle(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  const fontScale = cap.type === "emphasis" ? 1.3 : 1;
  let fontSize = FONT_SUBTITLE * m.unit * theme.fontScale * fontScale;
  const maxW = theme.maxWidth * m.w;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  let block = measureBlock(ctx, cap.text, {
    maxWidth: maxW - theme.paddingX * 2 * m.unit,
    maxLines: cap.maxLines,
    lineHeightFactor: theme.lineHeight,
  });
  const widest = block.blockW;
  if (widest > maxW - theme.paddingX * 2 * m.unit) {
    fontSize = Math.max(FONT_MIN * m.unit, fontSize * ((maxW - theme.paddingX * 2 * m.unit) / widest));
    setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
    block = measureBlock(ctx, cap.text, {
      maxWidth: maxW - theme.paddingX * 2 * m.unit,
      maxLines: cap.maxLines,
      lineHeightFactor: theme.lineHeight,
    });
  }
  const padX = theme.paddingX * m.unit;
  const padY = theme.paddingY * m.unit;
  const boxW = Math.min(maxW, block.blockW + padX * 2);
  const boxH = block.blockH + padY * 1.4;
  const boxX = rect.x + (rect.w - boxW) / 2;
  const boxY = rect.y + (rect.h - boxH) / 2;
  drawPillShape(ctx, boxX, boxY, boxW, boxH, theme, anim.alpha);
  const revealChars = anim.reveal < 1
    ? Math.floor(anim.reveal * cap.text.replace(/\s+/g, "").length + 0.0001)
    : -1;
  drawLinesWithAccent(
    ctx, call, block.lines, fontSize, block.lineHeight,
    boxX + padX, boxY + padY * 0.7, theme.textAlign, boxW - padX * 2, revealChars
  );
  resetSpacing(ctx);
  return { x: boxX, y: boxY, w: boxW, h: boxH };
}

/** Editorial subtitle: strip scrim halus, rata kiri, tanpa pil. */
function drawEditorialSubtitle(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  const fontSize = FONT_SUBTITLE * m.unit * theme.fontScale;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, 0.5 * m.unit);
  const block = measureBlock(ctx, cap.text, {
    maxWidth: theme.maxWidth * m.w - theme.paddingX * 2 * m.unit,
    maxLines: cap.maxLines,
    lineHeightFactor: theme.lineHeight,
  });
  const padY = theme.paddingY * m.unit;
  const padX = theme.paddingX * m.unit;
  const boxX = rect.x;
  const boxW = Math.min(rect.w, block.blockW + padX * 2 + 10 * m.unit);
  const boxH = block.blockH + padY * 1.4;
  const boxY = rect.y + (rect.h - boxH) / 2;
  ctx.fillStyle = themeAlpha(theme.scrim, theme.scrimAlpha * anim.alpha);
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
  ctx.fillRect(boxX, boxY, 6 * m.unit, boxH);
  drawLinesWithAccent(ctx, call, block.lines, fontSize, block.lineHeight, boxX + padX + 10 * m.unit, boxY + padY * 0.7, "left", boxW - padX * 2 - 10 * m.unit, -1);
  resetSpacing(ctx);
  return { x: boxX, y: boxY, w: boxW, h: boxH };
}

/** Gelembung: speech / thought / dialogue / notification / follow. */
function drawBubble(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect, anchorPx } = call;
  const isThought = cap.type === "thought-bubble";
  const isNotification = cap.type === "notification-bubble";
  const isDialogue = cap.type === "dialogue-bubble";
  const bubbleStyle = cap.style ?? "rounded";
  const fontSize = (isNotification ? FONT_ANNOTATION : FONT_BUBBLE) * m.unit * theme.fontScale;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
  const label = isDialogue && cap.sender ? cap.sender.toUpperCase() : "";
  const block = measureBlock(ctx, cap.text, {
    maxWidth: 0.62 * m.w,
    maxLines: cap.maxLines,
    lineHeightFactor: theme.lineHeight,
  });
  const padX = (isNotification ? 18 : theme.paddingX) * m.unit;
  const padY = (isNotification ? 12 : theme.paddingY) * m.unit;
  const labelH = label ? fontSize * 0.9 : 0;
  const boxW = Math.min(0.86 * m.w, block.blockW + padX * 2 + (isNotification ? 34 * m.unit : 0));
  const boxH = block.blockH + padY * 1.5 + labelH;
  const boxX = rect.x + (rect.w - boxW) / 2;
  const boxY = rect.y + (rect.h - boxH) / 2;

  const bubbleTheme: CaptionThemeTokens = { ...theme };
  if (bubbleStyle === "comic") {
    bubbleTheme.backgroundColor = "#FFFFFF";
    bubbleTheme.backgroundAlpha = 0.97 * anim.alpha;
    bubbleTheme.borderColor = "#111111";
    bubbleTheme.borderWidth = 3 * m.unit;
    bubbleTheme.borderRadius = 34 * m.unit;
    bubbleTheme.textColor = "#111111";
  } else if (bubbleStyle === "minimal") {
    bubbleTheme.borderRadius = 12 * m.unit;
    bubbleTheme.borderWidth = 0;
    bubbleTheme.backgroundAlpha = 0.9 * anim.alpha;
  }
  if (isThought) {
    bubbleTheme.borderRadius = boxW / 2 > 80 * m.unit ? 60 * m.unit : bubbleTheme.borderRadius;
  }
  drawPillShape(ctx, boxX, boxY, boxW, boxH, bubbleTheme, anim.alpha);

  if (isNotification) {
    const dotR = 9 * m.unit;
    ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
    ctx.beginPath();
    ctx.arc(boxX + boxW - padX - dotR, boxY + padY + dotR, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  if (label) {
    setFont(ctx, theme.displayWeight, fontSize * 0.62, theme.fontFamily, 1.5 * m.unit);
    ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, boxX + padX, boxY + padY * 0.75 + labelH / 2);
  }
  drawLinesWithAccent(
    ctx, call, block.lines, fontSize, block.lineHeight,
    boxX + padX + (isNotification ? 34 * m.unit : 0),
    boxY + padY * 0.75 + labelH,
    "left", boxW - padX * 2 - (isNotification ? 34 * m.unit : 0), -1
  );
  resetSpacing(ctx);

  // Ekor menuju anchor.
  if (anchorPx) {
    const ax = anchorPx.x + anchorPx.w / 2;
    const ay = anchorPx.y + (anchorPx.h ? anchorPx.h * 0.12 : 0);
    ctx.save();
    ctx.globalAlpha = anim.alpha;
    if (isThought) {
      ctx.fillStyle = themeAlpha(bubbleTheme.backgroundColor, bubbleTheme.backgroundAlpha || 1);
      const steps = 3;
      for (let i = 1; i <= steps; i++) {
        const p = i / (steps + 1);
        const cxp = boxX + boxW / 2 + (ax - (boxX + boxW / 2)) * p;
        const cyp = boxY + boxH + (ay - (boxY + boxH)) * p;
        const r = (11 - i * 2.4) * m.unit;
        ctx.beginPath();
        ctx.arc(cxp, cyp, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
        if (bubbleStyle === "comic") {
          ctx.strokeStyle = "#111111";
          ctx.lineWidth = 2 * m.unit;
          ctx.stroke();
        }
      }
    } else {
      const below = ay > boxY + boxH / 2;
      const baseY = below ? boxY + boxH - 1 : boxY + 1;
      const tailW = Math.min(30 * m.unit, boxW * 0.3);
      const bx = Math.max(boxX + tailW, Math.min(boxX + boxW - tailW, ax));
      ctx.beginPath();
      ctx.moveTo(bx - tailW / 2, baseY);
      ctx.lineTo(bx + tailW / 2, baseY);
      ctx.lineTo(Math.max(boxX, Math.min(boxX + boxW, ax)), ay);
      ctx.closePath();
      ctx.fillStyle = themeAlpha(bubbleTheme.backgroundColor, bubbleTheme.backgroundAlpha || 1);
      ctx.fill();
      if (bubbleStyle === "comic") {
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 3 * m.unit;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(bx - tailW / 2, baseY);
        ctx.lineTo(Math.max(boxX, Math.min(boxX + boxW, ax)), ay);
        ctx.lineTo(bx + tailW / 2, baseY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  return { x: boxX, y: boxY, w: boxW, h: boxH };
}

/** Antarmuka chat: gelembung masuk/keluar berurutan + typing indicator. */
function drawChat(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect, localT } = call;
  const messages = cap.messages ?? [];
  if (messages.length === 0) return rect;
  const fontSize = FONT_CHAT * m.unit * theme.fontScale;
  const padX = 20 * m.unit;
  const padY = 12 * m.unit;
  const avatarR = 17 * m.unit;
  const step = 1.05;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
  const measured = messages.map((msg) => {
    const side = msg.side ?? (msg.sender === cap.sender ? "out" : "in");
    const block = measureBlock(ctx, msg.text, {
      maxWidth: 0.52 * m.w,
      maxLines: cap.maxLines,
      lineHeightFactor: theme.lineHeight,
    });
    return { msg, side, block, h: block.blockH + padY * 1.6 };
  });
  const maxVisible = 4;
  const visible = measured.slice(-maxVisible);
  const totalH = visible.reduce((a, b) => a + b.h + 10 * m.unit, 0);
  const typingH = 40 * m.unit;
  const blockH = Math.min(rect.h, totalH + typingH);
  const originY = rect.y + rect.h - blockH;
  let cursorY = originY;
  const baseTime = cap.at + 0.35;
  ctx.textBaseline = "middle";
  visible.forEach((item, idx) => {
    const globalIdx = measured.length - visible.length + idx;
    const msgStart = baseTime + globalIdx * step + (item.msg.delay ?? 0);
    const age = localT - msgStart;
    if (age < 0) return;
    const appear = Math.min(1, age / 0.32);
    const eased = 1 - Math.pow(1 - appear, 3);
    const isOut = item.side === "out";
    const bubbleW = Math.min(0.62 * m.w, item.block.blockW + padX * 2 + (isOut ? 0 : avatarR * 2 + 8 * m.unit));
    const bubbleX = isOut
      ? rect.x + rect.w - bubbleW
      : rect.x;
    const bubbleY = cursorY + (1 - eased) * 16 * m.unit;
    ctx.save();
    ctx.globalAlpha = anim.alpha * eased;
    const bgColor = isOut ? theme.accentColor : theme.backgroundColor;
    const textColor = isOut
      ? (luminance(theme.accentColor) > 0.45 ? "#141414" : "#FFFFFF")
      : theme.textColor;
    ctx.fillStyle = themeAlpha(bgColor, isOut ? 0.95 : theme.backgroundAlpha);
    roundRectPath(ctx, bubbleX, bubbleY, bubbleW, item.h, theme.borderRadius * 0.7);
    ctx.fill();
    if (!isOut) {
      ctx.fillStyle = themeAlpha(theme.accentColor, 0.9);
      ctx.beginPath();
      ctx.arc(bubbleX + padX + avatarR, bubbleY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.fill();
      setFont(ctx, theme.displayWeight, fontSize * 0.66, theme.fontFamily);
      ctx.fillStyle = themeAlpha(luminance(theme.accentColor) > 0.45 ? "#141414" : "#FFFFFF", 1);
      ctx.textAlign = "center";
      ctx.fillText((item.msg.sender ?? "?").slice(0, 1).toUpperCase(), bubbleX + padX + avatarR, bubbleY + avatarR + 1);
    }
    setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
    ctx.textAlign = "left";
    ctx.fillStyle = themeAlpha(textColor, 1);
    const textX = isOut ? bubbleX + padX : bubbleX + padX + avatarR * 2 + 8 * m.unit;
    item.block.lines.forEach((line: string, li: number) => {
      ctx.fillText(line, textX, bubbleY + padY * 0.8 + item.block.lineHeight * li + item.block.lineHeight / 2, bubbleW - padX * 2);
    });
    ctx.restore();
    cursorY += item.h + 10 * m.unit;
  });
  // Typing indicator bila masih ada pesan berikutnya.
  const nextIdx = Math.floor((localT - baseTime) / step);
  if (nextIdx < messages.length && nextIdx >= 0) {
    ctx.save();
    ctx.globalAlpha = anim.alpha * 0.85;
    const dots = 3;
    for (let d = 0; d < dots; d++) {
      const phase = localT * 6 - d * 0.8;
      const bounce = Math.abs(Math.sin(phase)) * 5 * m.unit;
      ctx.fillStyle = themeAlpha(theme.accentColor, 0.8);
      ctx.beginPath();
      ctx.arc(rect.x + 22 * m.unit + d * 16 * m.unit, cursorY + 16 * m.unit - bounce, 6 * m.unit, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return { x: rect.x, y: originY, w: rect.w, h: blockH };
}

/** Kinetic typography: kata aktif tersinkronisasi + mode variasi. */
function drawKinetic(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect, tAbs, localT } = call;
  const variant = cap.variant ?? "word";
  const fontSize = FONT_KINETIC * m.unit * theme.fontScale;
  setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  const words = cap.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return rect;
  const maxW = Math.min(rect.w, theme.maxWidth * m.w);
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentW = 0;
  const spaceW = ctx.measureText(" ").width;
  for (const word of words) {
    const wWidth = ctx.measureText(word).width;
    if (currentW > 0 && currentW + spaceW + wWidth > maxW) {
      lines.push(currentLine);
      currentLine = [word];
      currentW = wWidth;
    } else {
      currentLine.push(word);
      currentW += (currentW > 0 ? spaceW : 0) + wWidth;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  const lineHeight = fontSize * 1.18;
  const blockH = lines.length * lineHeight;
  const activeIdx = cap.words && cap.words.length > 0 ? activeWordIndex(cap.words, tAbs) : -1;
  const centerY = rect.y + rect.h / 2;
  let wordIdx = 0;
  ctx.textBaseline = "middle";
  for (let li = 0; li < lines.length; li++) {
    const lineWidth = lines[li].reduce((a, w) => a + ctx.measureText(w).width, 0) + spaceW * (lines[li].length - 1);
    let x = rect.x + (rect.w - lineWidth) / 2;
    const y = centerY - blockH / 2 + li * lineHeight + lineHeight / 2;
    for (const word of lines[li]) {
      const isEmph = isEmphasisWord(word, cap.emphasis);
      const isActive = wordIdx === activeIdx;
      const wordTiming = cap.words?.[wordIdx];
      let wordAlpha = anim.alpha;
      let dy = 0;
      let scale = 1;
      if (variant === "word" || variant === "scalePop" || variant === "bounce") {
        const appear = wordTiming
          ? Math.max(0, Math.min(1, (tAbs - (wordTiming.start - 0.06)) / 0.26))
          : Math.min(1, Math.max(0, (anim.reveal * words.length - wordIdx)));
        if (appear <= 0) { wordIdx++; continue; }
        const eased = 1 - Math.pow(1 - appear, 3);
        wordAlpha *= eased;
        dy = (1 - eased) * 18 * m.unit;
        if (variant === "scalePop") scale = 0.5 + 0.5 * eased + (isActive ? 0.1 : 0);
        if (variant === "bounce" && isActive) dy -= Math.abs(Math.sin(localT * 9)) * 10 * m.unit;
        if (isActive) scale = Math.max(scale, 1.1);
      } else if (variant === "char") {
        const chars = charTimings(wordTiming ?? { text: word, start: tAbs, end: tAbs + 0.3 });
        let visible = "";
        for (const c of chars) if (tAbs >= c.start - 0.02) visible += c.ch;
        if (visible.length === 0) { wordIdx++; continue; }
        ctx.save();
        ctx.globalAlpha = anim.alpha;
        ctx.fillStyle = themeAlpha(isEmph ? theme.accentColor : theme.textColor, 1);
        ctx.textAlign = "left";
        ctx.fillText(visible, x, y);
        ctx.restore();
        x += ctx.measureText(word).width + spaceW;
        wordIdx++;
        continue;
      } else if (variant === "tracking") {
        wordAlpha *= anim.alpha;
      } else {
        // mask/split: reveal global dengan clip.
        wordAlpha *= anim.alpha;
      }
      ctx.save();
      ctx.globalAlpha = wordAlpha;
      if (theme.backgroundAlpha < 0.2 && theme.outlineWidth > 0) {
        ctx.lineWidth = theme.outlineWidth * m.unit;
        ctx.strokeStyle = themeAlpha(theme.outlineColor, 1);
        ctx.lineJoin = "round";
        ctx.strokeText(word, x, y + dy);
      }
      ctx.fillStyle = themeAlpha(
        isActive || isEmph ? theme.accentColor : theme.textColor, 1
      );
      if (scale !== 1 || dy !== 0) {
        ctx.translate(x, y + dy);
        ctx.scale(scale, scale);
        ctx.textAlign = "left";
        ctx.fillText(word, 0, 0);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(word, x, y + dy);
      }
      ctx.restore();
      x += ctx.measureText(word).width + spaceW;
      wordIdx++;
    }
  }
  resetSpacing(ctx);
  const w = Math.min(rect.w, maxW);
  return { x: rect.x + (rect.w - w) / 2, y: centerY - blockH / 2, w, h: blockH };
}

/** Anotasi melayang: label + garis penghubung + panah + highlight box. */
function drawAnnotation(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect, anchorPx, tAbs } = call;
  const isData = cap.type === "data-caption" || cap.variant === "data";
  const isTech = cap.variant === "tech";
  const fontSize = FONT_ANNOTATION * m.unit * theme.fontScale;
  setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, (isTech ? 1.4 : 0.4) * m.unit);
  const parts = cap.text.includes(":") ? cap.text.split(":") : null;
  const label = parts ? parts[0].trim() : cap.text;
  const value = parts ? parts.slice(1).join(":").trim() : "";
  const labelUpper = isTech || isData ? label.toUpperCase() : label;
  const block = measureBlock(ctx, labelUpper + (value ? "  " + value : ""), {
    maxWidth: 0.5 * m.w,
    maxLines: cap.maxLines,
    lineHeightFactor: theme.lineHeight,
  });
  const padX = theme.paddingX * 0.7 * m.unit;
  const padY = theme.paddingY * 0.7 * m.unit;
  const boxW = Math.min(0.56 * m.w, block.blockW + padX * 2);
  const boxH = block.blockH + padY * 1.6;
  const boxX = rect.x + (rect.w - boxW) / 2;
  const boxY = rect.y + (rect.h - boxH) / 2;
  drawPillShape(ctx, boxX, boxY, boxW, boxH, theme, anim.alpha);
  ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
  ctx.fillRect(boxX, boxY, 5 * m.unit, boxH);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (value) {
    setFont(ctx, theme.bodyWeight, fontSize * 0.8, theme.fontFamily, 0.4 * m.unit);
    ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha * 0.8);
    ctx.fillText(labelUpper, boxX + padX + 6 * m.unit, boxY + padY * 0.8 + block.lineHeight * 0.25);
    setFont(ctx, theme.displayWeight, fontSize * 1.15, theme.fontFamily, 0.6 * m.unit);
    ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
    ctx.fillText(value, boxX + padX + 6 * m.unit, boxY + padY * 0.8 + block.lineHeight * 0.9);
  } else {
    ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
    ctx.fillText(labelUpper, boxX + padX + 6 * m.unit, boxY + boxH / 2);
  }
  resetSpacing(ctx);

  if (anchorPx) {
    const ax = anchorPx.x + anchorPx.w / 2;
    const ay = anchorPx.y + anchorPx.h / 2;
    const startX = Math.max(boxX, Math.min(boxX + boxW, ax));
    const startY = ay > boxY + boxH ? boxY + boxH : ay < boxY ? boxY : boxY + boxH / 2;
    ctx.save();
    ctx.globalAlpha = anim.alpha * 0.9;
    ctx.strokeStyle = themeAlpha(theme.accentColor, 0.9);
    ctx.lineWidth = 2.4 * m.unit;
    ctx.setLineDash([7 * m.unit, 6 * m.unit]);
    ctx.lineDashOffset = -(tAbs * 26 * m.unit) % (13 * m.unit);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.setLineDash([]);
    // Panah kecil di ujung anchor.
    const angle = Math.atan2(ay - startY, ax - startX);
    const ah = 9 * m.unit;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - ah * Math.cos(angle - 0.45), ay - ah * Math.sin(angle - 0.45));
    ctx.lineTo(ax - ah * Math.cos(angle + 0.45), ay - ah * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fillStyle = themeAlpha(theme.accentColor, 0.95);
    ctx.fill();
    // Highlight box di sekeliling anchor (varian highlight).
    if (cap.variant === "highlight") {
      ctx.strokeStyle = themeAlpha(theme.accentColor, 0.75);
      ctx.lineWidth = 3 * m.unit;
      roundRectPath(ctx, anchorPx.x - 6 * m.unit, anchorPx.y - 6 * m.unit, anchorPx.w + 12 * m.unit, anchorPx.h + 12 * m.unit, 14 * m.unit);
      ctx.stroke();
    }
    ctx.restore();
  }
  return { x: boxX, y: boxY, w: boxW, h: boxH };
}

/** Impact: tipografi besar, dramatis, flash + scale. */
function drawImpact(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  let fontSize = FONT_IMPACT * m.unit * theme.fontScale;
  const maxW = Math.min(rect.w, 0.92 * m.w);
  setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  const block = measureBlock(ctx, cap.text, {
    maxWidth: maxW,
    maxLines: Math.max(1, cap.maxLines),
    lineHeightFactor: theme.lineHeight,
  });
  if (block.blockW > maxW && block.blockW > 0) {
    fontSize = Math.max(FONT_MIN * m.unit, fontSize * (maxW / block.blockW));
    setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  }
  const lines = block.lines;
  const centerY = rect.y + rect.h / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  lines.forEach((line, li) => {
    const y = centerY - ((lines.length - 1) * block.lineHeight) / 2 + li * block.lineHeight;
    ctx.save();
    ctx.globalAlpha = anim.alpha;
    if (anim.flash > 0.02) {
      ctx.shadowColor = themeAlpha("#FFFFFF", anim.flash * 0.8);
      ctx.shadowBlur = 40 * m.unit * anim.flash;
    } else if (theme.shadowBlur > 0) {
      ctx.shadowColor = themeAlpha(theme.outlineColor, 0.5);
      ctx.shadowBlur = theme.shadowBlur;
      ctx.shadowOffsetY = theme.shadowOffsetY;
    }
    if (theme.outlineWidth > 0) {
      ctx.lineWidth = theme.outlineWidth * m.unit;
      ctx.strokeStyle = themeAlpha(theme.outlineColor, anim.alpha);
      ctx.lineJoin = "round";
      ctx.strokeText(line, rect.x + rect.w / 2, y);
    }
    ctx.fillStyle = themeAlpha(isEmphasisWord(line, cap.emphasis) ? theme.accentColor : theme.textColor, anim.alpha);
    ctx.fillText(line, rect.x + rect.w / 2, y);
    ctx.restore();
  });
  resetSpacing(ctx);
  return { x: rect.x + (rect.w - maxW) / 2, y: centerY - block.blockH / 2, w: maxW, h: block.blockH };
}

/** Fullscreen typography dengan mask reveal. */
function drawFullscreenTypography(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  let fontSize = FONT_FULLSCREEN * m.unit * theme.fontScale;
  const maxW = 0.92 * m.w;
  setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  const block = measureBlock(ctx, cap.text, { maxWidth: maxW, maxLines: 3, lineHeightFactor: 1.12 });
  if (block.blockW > maxW && block.blockW > 0) {
    fontSize = Math.max(FONT_MIN * m.unit, fontSize * (maxW / block.blockW));
    setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily, theme.letterSpacing * m.unit);
  }
  const centerY = rect.y + rect.h / 2;
  ctx.save();
  if (anim.reveal < 1) {
    ctx.beginPath();
    ctx.rect(0, centerY - block.blockH, m.w * anim.reveal, block.blockH * 2);
    ctx.clip();
  }
  ctx.globalAlpha = anim.alpha;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  block.lines.forEach((line, li) => {
    const y = centerY - ((block.lines.length - 1) * block.lineHeight) / 2 + li * block.lineHeight;
    ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
    ctx.fillText(line, m.w / 2, y);
  });
  ctx.restore();
  resetSpacing(ctx);
  return { x: m.w * 0.04, y: centerY - block.blockH / 2, w: maxW, h: block.blockH };
}

/** Split-screen caption: dua blok teks di paruh kiri-kanan + garis pemisah. */
function drawSplitCaption(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  const halves = cap.text.split("|");
  const leftText = (halves[0] ?? "").trim();
  const rightText = (halves[1] ?? halves[0] ?? "").trim();
  const fontSize = FONT_ANNOTATION * 1.15 * m.unit * theme.fontScale;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, 0.4 * m.unit);
  const halfW = (rect.w - 24 * m.unit) / 2;
  const leftBlock = measureBlock(ctx, leftText, { maxWidth: halfW, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
  const rightBlock = measureBlock(ctx, rightText, { maxWidth: halfW, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
  const blockH = Math.max(leftBlock.blockH, rightBlock.blockH);
  const centerY = rect.y + rect.h / 2;
  const y0 = centerY - blockH / 2;
  ctx.save();
  ctx.globalAlpha = anim.alpha;
  ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
  ctx.fillRect(rect.x + halfW + 10 * m.unit, y0, 3 * m.unit, blockH);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
  leftBlock.lines.forEach((line, li) => ctx.fillText(line, rect.x, y0 + leftBlock.lineHeight * li + leftBlock.lineHeight / 2));
  ctx.textAlign = "right";
  rightBlock.lines.forEach((line, li) => ctx.fillText(line, rect.x + rect.w, y0 + rightBlock.lineHeight * li + rightBlock.lineHeight / 2));
  ctx.restore();
  resetSpacing(ctx);
  return { x: rect.x, y: y0, w: rect.w, h: blockH };
}

/** Side annotation: kolom sempit di tepi dengan bar aksen. */
function drawSideAnnotation(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  const fontSize = FONT_ANNOTATION * m.unit * theme.fontScale;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, 0.8 * m.unit);
  const block = measureBlock(ctx, cap.text, { maxWidth: rect.w - 20 * m.unit, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
  const boxH = block.blockH + theme.paddingY * m.unit;
  const boxY = rect.y + (rect.h - boxH) / 2;
  ctx.save();
  ctx.globalAlpha = anim.alpha;
  ctx.fillStyle = themeAlpha(theme.backgroundColor, theme.backgroundAlpha);
  ctx.fillRect(rect.x, boxY, rect.w, boxH);
  ctx.fillStyle = themeAlpha(theme.accentColor, anim.alpha);
  ctx.fillRect(rect.x, boxY, 6 * m.unit, boxH);
  ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  block.lines.forEach((line, li) =>
    ctx.fillText(line, rect.x + 16 * m.unit, boxY + block.lineHeight * li + block.lineHeight / 2)
  );
  ctx.restore();
  resetSpacing(ctx);
  return { x: rect.x, y: boxY, w: rect.w, h: boxH };
}

/** Instruction: badge nomor + teks langkah. */
function drawInstruction(call: DrawCall): RectPx {
  const { ctx, m, cap, anim, theme, rect } = call;
  const fontSize = FONT_ANNOTATION * 1.2 * m.unit * theme.fontScale;
  setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
  const block = measureBlock(ctx, cap.text, { maxWidth: rect.w - 90 * m.unit, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
  const pad = theme.paddingY * m.unit;
  const boxH = block.blockH + pad * 1.6;
  const boxW = Math.min(rect.w, block.blockW + pad * 2 + 60 * m.unit);
  const boxX = rect.x + (rect.w - boxW) / 2;
  const boxY = rect.y + (rect.h - boxH) / 2;
  drawPillShape(ctx, boxX, boxY, boxW, boxH, theme, anim.alpha);
  const badgeR = 24 * m.unit;
  ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
  ctx.beginPath();
  ctx.arc(boxX + badgeR + pad * 0.6, boxY + boxH / 2, badgeR, 0, Math.PI * 2);
  ctx.fill();
  const stepMatch = /(\d+)/.exec(cap.text);
  const step = stepMatch ? stepMatch[1] : String(Math.max(1, Math.round(cap.at)));
  ctx.fillStyle = themeAlpha(theme.backgroundColor, anim.alpha);
  setFont(ctx, theme.displayWeight, fontSize * 1.1, theme.fontFamily);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(step, boxX + badgeR + pad * 0.6, boxY + boxH / 2 + 1);
  ctx.fillStyle = themeAlpha(theme.textColor, anim.alpha);
  ctx.textAlign = "left";
  block.lines.forEach((line, li) =>
    ctx.fillText(line, boxX + badgeR * 2 + pad, boxY + pad * 0.8 + block.lineHeight * li + block.lineHeight / 2)
  );
  resetSpacing(ctx);
  return { x: boxX, y: boxY, w: boxW, h: boxH };
}

/** Dispatcher: menggambar satu caption dan mengembalikan rect okupasi. */
export function drawCaption(call: DrawCall): RectPx {
  const { ctx, m, cap, anim } = call;
  ctx.save();
  if (anim.blur > 0.2 && typeof ctx.filter === "string") {
    try {
      ctx.filter = "blur(" + anim.blur.toFixed(2) + "px)";
    } catch {
      /* blur tidak didukung */
    }
  }
  ctx.translate(anim.dx + anim.jitterX, anim.dy + anim.jitterY + anim.bob);
  ctx.globalAlpha = Math.max(0, Math.min(1, anim.alpha));
  let occupied: RectPx;
  switch (cap.type) {
    case "speech-bubble":
    case "thought-bubble":
    case "dialogue-bubble":
    case "notification-bubble":
    case "character-follow":
    case "object-follow":
      occupied = drawBubble(call);
      break;
    case "chat":
      occupied = drawChat(call);
      break;
    case "kinetic":
      occupied = drawKinetic(call);
      break;
    case "annotation":
    case "data-caption":
      occupied = drawAnnotation(call);
      break;
    case "impact":
    case "emphasis":
      occupied = drawImpact(call);
      break;
    case "fullscreen-typography":
      occupied = drawFullscreenTypography(call);
      break;
    case "split-caption":
      occupied = drawSplitCaption(call);
      break;
    case "side-annotation":
      occupied = drawSideAnnotation(call);
      break;
    case "instruction":
      occupied = drawInstruction(call);
      break;
    case "editorial-subtitle":
      occupied = drawEditorialSubtitle(call);
      break;
    case "center-caption":
    case "top-subtitle":
    case "left-caption":
    case "right-caption":
    case "corner-caption":
    case "floating-caption":
    default:
      occupied = drawPillSubtitle(call);
      break;
  }
  if (anim.blur > 0.2 && typeof ctx.filter === "string") {
    try {
      ctx.filter = "none";
    } catch {
      /* noop */
    }
  }
  ctx.restore();
  return occupied;
}

/** Ukuran konten yang dibutuhkan caption (pra-ukur untuk solver). */
export function estimateCaptionBox(ctx: any, m: Metrics, cap: ResolvedCaption): { w: number; h: number } {
  const theme = cap.theme;
  const u = m.unit;
  switch (cap.type) {
    case "speech-bubble":
    case "thought-bubble":
    case "dialogue-bubble":
    case "character-follow":
    case "object-follow": {
      const fontSize = FONT_BUBBLE * u * theme.fontScale;
      setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: 0.62 * m.w, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
      return { w: Math.min(0.86 * m.w, block.blockW + theme.paddingX * 2 * u), h: block.blockH + theme.paddingY * 1.5 * u + 30 * u };
    }
    case "notification-bubble": {
      const fontSize = FONT_ANNOTATION * u * theme.fontScale;
      setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: 0.5 * m.w, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
      return { w: Math.min(0.6 * m.w, block.blockW + 88 * u), h: block.blockH + theme.paddingY * 1.6 * u };
    }
    case "chat": {
      const fontSize = FONT_CHAT * u * theme.fontScale;
      setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
      const messages = cap.messages ?? [];
      const rows = Math.min(4, Math.max(1, messages.length));
      return { w: 0.86 * m.w, h: rows * 74 * u + 52 * u };
    }
    case "kinetic": {
      const fontSize = FONT_KINETIC * u * theme.fontScale;
      setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: Math.min(0.88 * m.w, theme.maxWidth * m.w), maxLines: 3, lineHeightFactor: 1.18 });
      return { w: Math.min(0.9 * m.w, block.blockW + 40 * u), h: block.blockH + 20 * u };
    }
    case "annotation":
    case "data-caption": {
      const fontSize = FONT_ANNOTATION * u * theme.fontScale;
      setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: 0.5 * m.w, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
      return { w: Math.min(0.56 * m.w, block.blockW + theme.paddingX * 1.6 * u), h: block.blockH + theme.paddingY * 1.5 * u };
    }
    case "impact":
    case "emphasis": {
      const fontSize = FONT_IMPACT * u * theme.fontScale;
      setFont(ctx, theme.displayWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: 0.92 * m.w, maxLines: Math.max(1, cap.maxLines), lineHeightFactor: theme.lineHeight });
      return { w: Math.min(0.94 * m.w, block.blockW + 60 * u), h: block.blockH + 40 * u };
    }
    case "fullscreen-typography":
      return { w: 0.92 * m.w, h: 0.5 * m.h };
    case "split-caption":
      return { w: 0.88 * m.w, h: 130 * u };
    case "side-annotation":
      return { w: 0.34 * m.w, h: 150 * u };
    case "instruction": {
      const fontSize = FONT_ANNOTATION * 1.2 * u * theme.fontScale;
      setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily);
      const block = measureBlock(ctx, cap.text, { maxWidth: 0.6 * m.w, maxLines: cap.maxLines, lineHeightFactor: theme.lineHeight });
      return { w: Math.min(0.8 * m.w, block.blockW + 120 * u), h: block.blockH + theme.paddingY * 1.8 * u };
    }
    default: {
      let fontSize = FONT_SUBTITLE * u * theme.fontScale * (cap.type === "emphasis" ? 1.3 : 1);
      setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, theme.letterSpacing * u);
      const block = measureBlock(ctx, cap.text, {
        maxWidth: theme.maxWidth * m.w - theme.paddingX * 2 * u,
        maxLines: cap.maxLines,
        lineHeightFactor: theme.lineHeight,
      });
      if (block.blockW > theme.maxWidth * m.w - theme.paddingX * 2 * u && block.blockW > 0) {
        fontSize = Math.max(FONT_MIN * u, fontSize * ((theme.maxWidth * m.w - theme.paddingX * 2 * u) / block.blockW));
        setFont(ctx, theme.bodyWeight, fontSize, theme.fontFamily, theme.letterSpacing * u);
      }
      return {
        w: Math.min(theme.maxWidth * m.w, block.blockW + theme.paddingX * 2 * u),
        h: block.blockH + theme.paddingY * 1.4 * u,
      };
    }
  }
}


/**
 * Ukuran estimasi caption sebelum menggambar; dipakai solver penempatan untuk
 * menghitung kandidat posisi. Perkiraan ini sengaja konservatif (sedikit lebih
 * besar) supaya solver menjauhi tabrakan lebih dini.
 */
export function estimateCaptionBox(ctx: any, m: Metrics, cap: ResolvedCaption): { w: number; h: number } {
  const u = m.unit;
  switch (cap.type) {
    case "kinetic":
      return { w: m.w * 0.86, h: m.h * 0.34 };
    case "impact":
      return { w: m.w * 0.82, h: m.h * 0.24 };
    case "fullscreen-typography":
      return { w: m.w * 0.94, h: m.h * 0.8 };
    case "split-caption":
      return { w: m.w * 0.86, h: m.h * 0.4 };
    case "side-annotation":
      return { w: m.w * 0.34, h: m.h * 0.3 };
    case "chat": {
      const n = (cap.messages ?? []).length || 1;
      return { w: m.w * 0.64, h: Math.min(m.h * 0.5, 70 * u + n * 84 * u) };
    }
    case "speech-bubble":
    case "thought-bubble":
    case "dialogue-bubble":
    case "notification-bubble":
    case "character-follow":
    case "object-follow": {
      const isNotification = cap.type === "notification-bubble";
      const fontSize = (isNotification ? FONT_ANNOTATION : FONT_BUBBLE) * u * cap.theme.fontScale;
      setFont(ctx, cap.theme.bodyWeight, fontSize, cap.theme.fontFamily);
      const block = measureBlock(ctx, cap.text, {
        maxWidth: 0.62 * m.w,
        maxLines: cap.maxLines,
        lineHeightFactor: cap.theme.lineHeight,
      });
      const padX = (isNotification ? 18 : cap.theme.paddingX) * u;
      const padY = (isNotification ? 12 : cap.theme.paddingY) * u;
      const labelH = cap.type === "dialogue-bubble" && cap.sender ? fontSize * 0.9 : 0;
      return {
        w: Math.min(0.86 * m.w, block.blockW + padX * 2 + (isNotification ? 34 * u : 0)),
        h: block.blockH + padY * 1.5 + labelH + 30 * u,
      };
    }
    case "annotation":
    case "data-caption":
    case "instruction": {
      const fontSize = (cap.type === "instruction" ? FONT_SUBTITLE : FONT_ANNOTATION) * u * cap.theme.fontScale;
      setFont(ctx, cap.theme.bodyWeight, fontSize, cap.theme.fontFamily);
      const block = measureBlock(ctx, cap.text, {
        maxWidth: (cap.type === "instruction" ? 0.5 : 0.4) * m.w,
        maxLines: 2,
        lineHeightFactor: cap.theme.lineHeight,
      });
      return {
        w: Math.min(0.6 * m.w, block.blockW + 48 * u),
        h: block.blockH + 40 * u,
      };
    }
    default: {
      // Keluarga subtitle pil: replika ukuran drawPillSubtitle.
      let fontSize = FONT_SUBTITLE * u * cap.theme.fontScale * (cap.type === "emphasis" ? 1.3 : 1);
      setFont(ctx, cap.theme.bodyWeight, fontSize, cap.theme.fontFamily, cap.theme.letterSpacing * u);
      const maxW = cap.theme.maxWidth * m.w;
      let block = measureBlock(ctx, cap.text, {
        maxWidth: maxW - cap.theme.paddingX * 2 * u,
        maxLines: cap.maxLines,
        lineHeightFactor: cap.theme.lineHeight,
      });
      if (block.blockW > maxW - cap.theme.paddingX * 2 * u) {
        const shrink = (maxW - cap.theme.paddingX * 2 * u) / Math.max(1, block.blockW);
        fontSize = Math.max(FONT_MIN * u, fontSize * shrink);
        setFont(ctx, cap.theme.bodyWeight, fontSize, cap.theme.fontFamily, cap.theme.letterSpacing * u);
        block = measureBlock(ctx, cap.text, {
          maxWidth: maxW - cap.theme.paddingX * 2 * u,
          maxLines: cap.maxLines,
          lineHeightFactor: cap.theme.lineHeight,
        });
      }
      resetSpacing(ctx);
      return {
        w: Math.min(maxW, block.blockW + cap.theme.paddingX * 2 * u),
        h: block.blockH + cap.theme.paddingY * 1.4 * u,
      };
    }
  }
}

/**
 * Dispatcher utama: menerapkan transform animasi (geser/skala/rotasi/jitter/
 * blur) di sekitar pusat rect, lalu menggambar sesuai tipe dan mengembalikan
 * rect okupasi untuk anti-tumpukan antar caption. Fungsi per tipe menerima
 * tema lewat call.theme (diinjeksi di sini dari cap.theme).
 */
export function drawCaption(call: DrawCall): RectPx {
  const { cap, ctx, anim } = call;
  if (anim.alpha <= 0.01) return { x: 0, y: 0, w: 0, h: 0 };
  const call2: DrawCall & { theme: CaptionThemeTokens } = { ...call, theme: cap.theme };
  ctx.save();
  const cx = call.rect.x + call.rect.w / 2;
  const cy = call.rect.y + call.rect.h / 2;
  const jx = anim.jitterX ?? 0;
  const jy = anim.jitterY ?? 0;
  if (anim.dx || anim.dy || jx || jy || anim.scale !== 1 || anim.rotate) {
    ctx.translate(cx + anim.dx + jx, cy + anim.dy + jy);
    ctx.rotate(anim.rotate ?? 0);
    ctx.scale(anim.scale ?? 1, anim.scale ?? 1);
    ctx.translate(-cx, -cy);
  }
  if (anim.blur && anim.blur > 0.5) {
    try { (ctx as any).filter = `blur(${Math.min(8, anim.blur)}px)`; } catch { /* filter opsional */ }
  }
  let used: RectPx;
  switch (cap.type) {
    case "speech-bubble":
    case "thought-bubble":
    case "dialogue-bubble":
    case "notification-bubble":
    case "character-follow":
    case "object-follow":
      used = drawBubble(call2);
      break;
    case "chat":
      used = drawChat(call2);
      break;
    case "kinetic":
      used = drawKinetic(call2);
      break;
    case "annotation":
    case "data-caption":
      used = drawAnnotation(call2);
      break;
    case "impact":
      used = drawImpact(call2);
      break;
    case "fullscreen-typography":
      used = drawFullscreenTypography(call2);
      break;
    case "split-caption":
      used = drawSplitCaption(call2);
      break;
    case "side-annotation":
      used = drawSideAnnotation(call2);
      break;
    case "instruction":
      used = drawInstruction(call2);
      break;
    case "editorial-subtitle":
      used = drawEditorialSubtitle(call2);
      break;
    default:
      used = drawPillSubtitle(call2);
      break;
  }
  try { (ctx as any).filter = "none"; } catch { /* ignore */ }
  ctx.restore();
  return used;
}
