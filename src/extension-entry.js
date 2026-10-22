// Browser entry point attached to globalThis.LeadRowClassifier for the Chrome extension content script.
import { classify, toGoogleSheetsRow } from "./classify.js";
import { cleanLeadText } from "./text.js";

globalThis.LeadRowClassifier = {
  classify,
  toGoogleSheetsRow,
  cleanLeadText,
};
