// Extension entry bridging to the new modular classifier engine
const { classify, toGoogleSheetsRow } = require("./src/classify.js");
const { cleanLeadText } = require("./src/text.js");

module.exports = {
  cleanLeadText,
  classify,
  toGoogleSheetsRow,
};
