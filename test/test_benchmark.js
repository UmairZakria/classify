import { classify } from "../src/classify.js";

// Let's test what happens currently on various Boyd Derby notes:
const tests = [
  { label: "Standalone line", text: "Boyd Derby\n481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "Same line as address", text: "Boyd Derby 481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "Same line as address with dash", text: "Boyd Derby - 481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "Same line with pipe and phone", text: "Boyd Derby | (202) 555-0101\n481 Sample Creek Rd, Columbus, OH 43000" },
  { label: "Dangling label", text: "Name:\nBoyd Derby\n481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "With Clean Record", text: "Clean Record\nBoyd Derby\n481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "With North Carolina", text: "North Carolina\nBoyd Derby\n481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
  { label: "With extra words on line", text: "Boyd Derby customer called\n481 Sample Creek Rd, Columbus, OH 43000\n(202) 555-0101" },
];

tests.forEach(t => {
  const res = classify(t.text);
  console.log(`${t.label}: "${res.name}"`);
});
