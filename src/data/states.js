// US states + territories. Used only to FIND where an address ends - the
// state is never rewritten (a typed "Texas" stays "Texas").

export const STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"], ["PR", "Puerto Rico"], ["GU", "Guam"], ["VI", "Virgin Islands"],
];

export const STATE_ABBRS = new Set(STATES.map(([abbr]) => abbr));

// Common informal spellings people type for state names.
const EXTRA_NAMES = {
  "tex": "TX", "texs": "TX", "calif": "CA", "cali": "CA", "fla": "FL", "flordia": "FL", "penn": "PA",
  "penna": "PA", "mass": "MA", "wash": "WA", "mich": "MI", "minn": "MN", "wisc": "WI", "ariz": "AZ",
  "colo": "CO", "conn": "CT", "okla": "OK", "tenn": "TN", "ill": "IL", "ind": "IN", "kans": "KS",
  "geogia": "GA", "louisana": "LA", "missisippi": "MS", "tennesee": "TN", "conneticut": "CT",
  "washington dc": "DC", "washington d c": "DC",
};

// Map of lower-case multi-word name -> abbr, longest first for greedy matching.
export const STATE_NAMES = new Map(
  [
    ...STATES.map(([abbr, name]) => [name.toLowerCase(), abbr]),
    ...Object.entries(EXTRA_NAMES),
  ].sort((a, b) => b[0].split(" ").length - a[0].split(" ").length)
);

export const MAX_STATE_WORDS = Math.max(...[...STATE_NAMES.keys()].map((k) => k.split(" ").length));
