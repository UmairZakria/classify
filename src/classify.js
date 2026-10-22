// Main classifier orchestrator.
// Coordinates text normalization, tokenization, label finding, and field extractors.
// Produces the unified record matching the CRM columns.

import { normalize, cleanLeadText, tokenize, lines } from "./text.js";
import { findLabels } from "./labels.js";
import { findPhones, findEmails } from "./extract/contact.js";
import { findDates, formatDate } from "./extract/dates.js";
import { findVehicles, findVehicleCount } from "./extract/vehicles.js";
import { findInsuranceCarriers } from "./extract/insurance.js";
import { findAddress } from "./extract/address.js";
import { findNames } from "./extract/person.js";

export function classify(rawText) {
  const cleanedText = cleanLeadText(rawText);
  if (!cleanedText) {
    return {
      phone: null,
      name: null,
      dateOfBirth: null,
      spouseName: null,
      spouseDob: null,
      email: null,
      vehicleCount: null,
      vehicles: [],
      address: null,
      insuranceCompany: null,
      insuranceDuration: null,
    };
  }

  const textLines = lines(cleanedText);
  const tokens = tokenize(cleanedText);
  const labels = findLabels(textLines);

  const ctx = {
    text: cleanedText,
    lines: textLines,
    tokens,
    labels,
  };

  // Phase 1: High-confidence structured extractions (phones, emails, explicit dates)
  const phones = findPhones(ctx);
  const emails = findEmails(ctx);
  const primaryPhone = phones.length ? phones[0].value : null;
  const primaryEmail = emails.length ? emails[0].value : null;

  // Block contact spans from being consumed by address or name
  const blockedSpans = [
    ...phones.map((p) => ({ start: p.start, end: p.end })),
    ...emails.map((e) => ({ start: e.start, end: e.end })),
  ];

  // Phase 2: Insurance carriers and vehicle extraction
  const insurance = findInsuranceCarriers(ctx, blockedSpans);
  const carrierCandidate = insurance.carrierCandidate;
  if (carrierCandidate) {
    blockedSpans.push({ start: carrierCandidate.start, end: carrierCandidate.end });
  }

  const vehicles = findVehicles(ctx, blockedSpans);
  for (const v of vehicles) {
    blockedSpans.push({ start: v.start, end: v.end });
  }
  const vehicleCount = findVehicleCount(ctx, blockedSpans) || (vehicles.length ? vehicles.length : null);

  // Phase 3: Address extraction (verbatim span, preserving complete text)
  const addressResult = findAddress(ctx, {
    stops: blockedSpans,
    carriers: insurance.allCandidates || [],
  });

  const address = addressResult ? addressResult.value : null;
  if (addressResult) {
    blockedSpans.push({ start: addressResult.start, end: addressResult.end });
  }

  // Phase 4: Dates & DOB
  const dates = findDates(ctx, blockedSpans);
  let dateOfBirth = null;

  // Prioritize dates with a dob label
  const dobLabeled = dates.find((d) =>
    ctx.labels.some((l) => l.field === "dob" && l.line === d.line && l.end <= d.start)
  );
  if (dobLabeled) {
    dateOfBirth = formatDate(dobLabeled);
    blockedSpans.push({ start: dobLabeled.start, end: dobLabeled.end });
  } else if (dates.length) {
    // Unlabeled plausible birth date: reasonable birth year
    const plausibleDob = dates.find((d) => d.year >= 1930 && d.year <= 2010);
    if (plausibleDob) {
      dateOfBirth = formatDate(plausibleDob);
      blockedSpans.push({ start: plausibleDob.start, end: plausibleDob.end });
    }
  }

  // Phase 5: Names and Spouse
  const names = findNames(ctx, blockedSpans);

  return {
    phone: primaryPhone,
    name: names.name,
    dateOfBirth,
    spouseName: names.spouseName,
    spouseDob: names.spouseDob || null,
    email: primaryEmail,
    vehicleCount: vehicleCount ? String(vehicleCount) : null,
    vehicles: vehicles.map((v) => v.value),
    address,
    insuranceCompany: insurance.carrier,
    insuranceDuration: insurance.duration,
  };
}

export function toGoogleSheetsRow(rawText) {
  const original = String(rawText || "").trim();
  if (!/[\r\n]/.test(original) && original.split("\t").length === 10) return original;

  const res = classify(rawText);

  const display = (val, fallback = "N/A") => {
    if (val == null) return fallback;
    const s = String(val).trim();
    return s === "" ? fallback : s;
  };

  let carrier = display(res.insuranceCompany);
  if (carrier !== "N/A" && res.insuranceDuration) {
    carrier = `${carrier} (for ${res.insuranceDuration})`;
  }

  const cells = [
    display(res.phone),
    display(res.name),
    display(res.dateOfBirth),
    display(res.spouseName),
    display(res.spouseDob),
    display(res.email),
    display(res.vehicleCount),
    display(res.vehicles.join(" / ")),
    display(res.address),
    carrier,
  ];

  return cells.map((val) => String(val).replace(/[\t\r\n]+/g, " ").trim()).join("\t");
}
