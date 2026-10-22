import test from "node:test";
import assert from "node:assert/strict";
import { classify, toGoogleSheetsRow } from "../src/classify.js";

test("User example: extracts full address verbatim with state and zip", () => {
  const text = `
    Patricia Bell
    617 Stellaway Dr, Desoto, Texas 75115
    Phone: 972-555-1234
    State Farm for 3 years
    2018 Toyota Camry
  `;
  const result = classify(text);
  assert.equal(result.address, "617 Stellaway Dr, Desoto, Texas 75115");
  assert.equal(result.insuranceCompany, "State Farm");
  assert.equal(result.insuranceDuration, "3 years");
  assert.equal(result.name, "Patricia Bell");
  assert.equal(result.phone, "9725551234");
  assert.deepEqual(result.vehicles, ["2018 Toyota Camry"]);
});

test("Extracts multi-line address preserving Apt and Zip", () => {
  const text = `
    Name: John Doe
    Address: 124 North Main St
    Apt 4B
    Dallas TX 75201-1234
    Tel: (214) 555-9876
    Insured with Geico for about 5 years
  `;
  const result = classify(text);
  assert.equal(result.address, "124 North Main St, Apt 4B, Dallas TX 75201-1234");
  assert.equal(result.insuranceCompany, "GEICO");
  assert.equal(result.insuranceDuration, "about 5 years");
  assert.equal(result.phone, "2145559876");
  assert.equal(result.name, "John Doe");
});

test("Fuzzy and variant carrier detection", () => {
  const samples = [
    { text: "has statefram since 2019", expected: "State Farm" },
    { text: "progresive insurance", expected: "Progressive" },
    { text: "current carrier: allstatee", expected: "Allstate" },
    { text: "liberty mutal for 2 yrs", expected: "Liberty Mutual" },
  ];
  for (const s of samples) {
    const res = classify(s.text);
    assert.equal(res.insuranceCompany, s.expected, `Failed for input: ${s.text}`);
  }
});

test("toGoogleSheetsRow output formatting", () => {
  const text = `
    Name: Marcus Vance
    1200 Market Street, Suite 300, Philadelphia, Pennsylvania 19107
    Phone: 215-555-0199
    DOB: 10/14/1982
    State Farm for 4 years
    2 cars: 2020 Honda Civic / 2017 Ford F-150
  `;
  const row = toGoogleSheetsRow(text);
  const parts = row.split("\t");
  assert.equal(parts.length, 10);
  assert.equal(parts[0], "2155550199"); // Phone
  assert.equal(parts[1], "Marcus Vance"); // Name
  assert.equal(parts[2], "10/14/1982"); // DOB
  assert.equal(parts[6], "2"); // No. of Cars
  assert.equal(parts[7], "2020 Honda Civic / 2017 Ford F-150"); // Year Make / Model
  assert.equal(parts[8], "1200 Market Street, Suite 300, Philadelphia, Pennsylvania 19107"); // Address
  assert.equal(parts[9], "State Farm (for 4 years)"); // Current Carrier
});
