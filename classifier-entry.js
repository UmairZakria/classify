"use strict";

const { classify } = require("../classify");
const { googleSheetsRow } = require("../lib/report");
const { VEHICLE_MAKES, VEHICLE_MODELS } = require("../data/vehicles");

const NOTE_LINE = /^\s*(?:CB|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?message|no\s+answer)\b.*$/i;
const TRAILING_NOTE =
  /\s+(?:\bCB\b|call\s*back|callback|follow[\s-]*up|f\/u|left\s+(?:a\s+)?message|no\s+answer)\b.*$/i;

const VEHICLE_SPELLING_FIXES = [
  [/\bforster\b/gi, "Forester"],
  [/\bforestr\b/gi, "Forester"],
  [/\bchevorlet\b/gi, "Chevrolet"],
  [/\bcheverolet\b/gi, "Chevrolet"],
  [/\bchevrollet\b/gi, "Chevrolet"],
  [/\bchevvy\b/gi, "Chevrolet"],
  [/\btoyta\b/gi, "Toyota"],
  [/\btoyata\b/gi, "Toyota"],
  [/\bcamery\b/gi, "Camry"],
  [/\bhondaa\b/gi, "Honda"],
  [/\bescap\b/gi, "Escape"],
  [/\bnisan\b/gi, "Nissan"],
  [/\bcorola\b/gi, "Corolla"],
  [/\bfussion\b/gi, "Fusion"],
  [/\bhyundia\b/gi, "Hyundai"],
  [/\btuscon\b/gi, "Tucson"],
  [/\bcivik\b/gi, "Civic"],
  [/\bmazdaa\b/gi, "Mazda"],
  [/\bedg\b/gi, "Edge"],
  [/\bcheroke\b/gi, "Cherokee"],
  [/\brav\s+4\b/gi, "RAV4"],
  [/\bcaddilac\b/gi, "Cadillac"],
  [/\blincon\b/gi, "Lincoln"],
  [/\brouge\b/gi, "Rogue"],
  [/\brougue\b/gi, "Rogue"],
  [/\bf-?150\b/gi, "F-150"],
  [/\bcx-?5\b/gi, "CX-5"],
];
const MAKE_NAMES = VEHICLE_MAKES.flatMap((make) =>
  [make.canonical, ...make.aliases].map((alias) => [alias, make.canonical])
).sort((a, b) => b[0].length - a[0].length);
const MODEL_NAMES = [...new Set(Object.values(VEHICLE_MODELS).flat())].sort((a, b) => b.length - a.length);

function replaceVehicleName(text, name, replacement) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=$|[^A-Za-z0-9])`, "gi");
  return text.replace(pattern, (_match, prefix) => `${prefix}${replacement}`);
}

function cleanLeadText(text) {
  return String(text)
    .split(/\r?\n/)
    .filter((line) => !NOTE_LINE.test(line))
    .map((line) =>
      line
        .replace(TRAILING_NOTE, "")
        .replace(/^\s*name\s+(?:might|may|could)\s+be\s*[:=-]?\s*/i, "Name: ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

function correctVehicleSpelling(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      if (!/\b(?:19|20)\d{2}\b/.test(line)) return line;
      let corrected = line.replace(/^\s*car\s*\d+\s*[:.)-]?\s*/i, "");
      corrected = VEHICLE_SPELLING_FIXES.reduce(
        (value, [pattern, correction]) => value.replace(pattern, correction),
        corrected
      );
      for (const [alias, canonical] of MAKE_NAMES) corrected = replaceVehicleName(corrected, alias, canonical);
      for (const model of MODEL_NAMES) corrected = replaceVehicleName(corrected, model, model);
      return corrected;
    })
    .join("\n");
}

function toGoogleSheetsRow(rawText) {
  const original = String(rawText).trim();
  if (!/[\r\n]/.test(original) && original.split("\t").length === 10) return original;
  const cleaned = cleanLeadText(rawText);
  if (!cleaned) throw new Error("The comments text area is empty.");
  return googleSheetsRow(classify(correctVehicleSpelling(cleaned)));
}

module.exports = { cleanLeadText, correctVehicleSpelling, toGoogleSheetsRow };
